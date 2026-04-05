import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

import { getLatestOsSnapshot } from "./optimizer-telemetry.mjs";
import { buildProcessKnowledgeIdentity } from "./process-knowledge-identity.mjs";

function toText(value) {
  return String(value ?? "").trim();
}

function uniqueNumbers(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(Number).filter((value) => Number.isFinite(value) && value > 0))];
}

function escapePsSingleQuoted(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function runPowerShellJson(script) {
  if (process.platform !== "win32") return {};
  const encoded = Buffer.from(`${script}\n`, "utf16le").toString("base64");
  try {
    const stdout = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 1024 * 1024,
      }
    );
    return stdout ? JSON.parse(stdout) : {};
  } catch {
    return {};
  }
}

function detectSigningStatus(signature = {}) {
  const status = toText(signature?.Status || signature?.status || "").toLowerCase();
  if (!status) return "unknown";
  if (status.includes("valid")) return "signed_valid";
  if (status.includes("notsigned")) return "unsigned";
  return `signed_${status}`;
}

function sha256ForFile(filePath) {
  const target = toText(filePath);
  if (!target || !fs.existsSync(target)) return null;
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
  } catch {
    return null;
  }
}

function parseRuntimeTarget(commandLine) {
  const tokens = toText(commandLine).match(/(?:[^\"]\S*|\".+?\")+/g) || [];
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i].replace(/^\"|\"$/g, "");
    if (!token || token.startsWith("-")) continue;
    if (/\.(py|pyw|js|mjs|cjs|ts|tsx|jar|ps1|cmd|bat)$/i.test(token)) return token;
  }
  return null;
}

function extractServiceNames(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => toText(row?.Name || row?.DisplayName || row?.name))
    .filter(Boolean)
    .slice(0, 20);
}

function getCandidateRows(entry) {
  const snapshot = getLatestOsSnapshot();
  const rows = Array.isArray(snapshot?.processes) ? snapshot.processes : [];
  const matches = [];
  for (const row of rows) {
    const identity = buildProcessKnowledgeIdentity(row);
    if (identity.identity_key && identity.identity_key === entry.identity_key) {
      matches.push(row);
    }
  }
  return matches;
}

function chooseBestRow(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  return [...list].sort((left, right) => {
    const leftCpu = Number(left?.cpuPercentHint || 0);
    const rightCpu = Number(right?.cpuPercentHint || 0);
    if (rightCpu !== leftCpu) return rightCpu - leftCpu;
    const leftMem = Number(left?.workingSetBytes || 0);
    const rightMem = Number(right?.workingSetBytes || 0);
    if (rightMem !== leftMem) return rightMem - leftMem;
    return Number(right?.pid || 0) - Number(left?.pid || 0);
  })[0];
}

export function collectLocalEvidence(entry = {}) {
  const rows = getCandidateRows(entry);
  const bestRow = chooseBestRow(rows);
  const pids = uniqueNumbers(rows.map((row) => row?.pid));
  const pid = Number(bestRow?.pid || 0) || null;
  const executablePath = toText(bestRow?.path || entry.last_path || "");

  const shellScript = process.platform === "win32"
    ? `
$ErrorActionPreference = 'SilentlyContinue'
$pidValue = ${pid && Number.isFinite(pid) ? pid : "$null"}
$pathValue = '${escapePsSingleQuoted(executablePath)}'

$proc = $null
if ($pidValue -and $pidValue -gt 0) {
  $proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [int]$pidValue) | Select-Object -First 1
}

if (-not $pathValue -and $proc) {
  $pathValue = [string]$proc.ExecutablePath
}

$ownerValue = $null
if ($proc) {
  try {
    $owner = Invoke-CimMethod -InputObject $proc -MethodName GetOwner
    if ($owner.ReturnValue -eq 0) {
      $ownerValue = (([string]$owner.Domain).Trim() + '\\' + ([string]$owner.User).Trim()).Trim('\\')
    }
  } catch {}
}

$versionInfo = $null
$signature = $null
if ($pathValue) {
  try { $versionInfo = (Get-Item -LiteralPath $pathValue).VersionInfo } catch {}
  try { $signature = Get-AuthenticodeSignature -FilePath $pathValue } catch {}
}

$services = @()
if ($pidValue -and $pidValue -gt 0) {
  try {
    $services = Get-CimInstance Win32_Service -Filter ("ProcessId=" + [int]$pidValue) |
      Select-Object Name, DisplayName
  } catch {}
}

[pscustomobject]@{
  commandLine = if ($proc) { [string]$proc.CommandLine } else { $null }
  username = $ownerValue
  executablePath = $pathValue
  version = if ($versionInfo) { [string]$versionInfo.FileVersion } else { $null }
  companyName = if ($versionInfo) { [string]$versionInfo.CompanyName } else { $null }
  productName = if ($versionInfo) { [string]$versionInfo.ProductName } else { $null }
  originalFilename = if ($versionInfo) { [string]$versionInfo.OriginalFilename } else { $null }
  signerName = if ($signature) { [string]$signature.SignerCertificate.Subject } else { $null }
  signatureStatus = if ($signature) { [string]$signature.Status } else { $null }
  hostedServices = $services
} | ConvertTo-Json -Depth 4 -Compress
`.trim()
    : "";

  const shell = shellScript ? runPowerShellJson(shellScript) : {};
  const resolvedPath = toText(shell?.executablePath || executablePath);
  const sha256 = sha256ForFile(resolvedPath);
  const runtimeTarget = parseRuntimeTarget(shell?.commandLine || "");

  const evidence = {
    pid,
    parent_pid: Number(bestRow?.parentPid || 0) || null,
    sample_pids: pids,
    image_name: toText(bestRow?.processName || entry.image_name),
    executable_path: resolvedPath || null,
    command_line: toText(shell?.commandLine || "") || null,
    username: toText(shell?.username || "") || null,
    cpu_snapshot: Number(bestRow?.cpuPercentHint || 0),
    memory_snapshot: Number(bestRow?.workingSetBytes || 0),
    company_name: toText(shell?.companyName || "") || null,
    product_name: toText(shell?.productName || entry.product_name || "") || null,
    file_version: toText(shell?.version || entry.last_version || "") || null,
    original_filename: toText(shell?.originalFilename || "") || null,
    signing_status: detectSigningStatus(shell?.signatureStatus),
    signer_name: toText(shell?.signerName || entry.last_signer || "") || null,
    sha256,
    hosted_services: extractServiceNames(shell?.hostedServices),
    runtime_target: runtimeTarget,
    signer_subject_raw: toText(shell?.signerName || "") || null,
  };

  return {
    evidence,
    sampleRows: rows,
    platform: process.platform,
    machine: os.hostname(),
  };
}
