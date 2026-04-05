import { spawn } from "node:child_process";
import process from "node:process";

const STATUS_RANK = {
  running: 0,
  starting: 1,
  stopping: 1,
  paused: 1,
  stopped: 2,
  disabled: 2,
  unknown: 3,
};

const STARTUP_RANK = {
  automatic: 0,
  automatic_delayed: 1,
  manual: 2,
  disabled: 3,
  unknown: 4,
};

function collectOutput(child) {
  return new Promise((resolveOutput, rejectOutput) => {
    const stdout = [];
    const stderr = [];

    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));

    child.once("error", rejectOutput);
    child.once("exit", (code) => {
      const stdoutText = Buffer.concat(stdout).toString("utf8").trim();
      const stderrText = Buffer.concat(stderr).toString("utf8").trim();
      if (code === 0) {
        resolveOutput({ stdout: stdoutText, stderr: stderrText });
        return;
      }
      rejectOutput(new Error(stderrText || stdoutText || `Process exited with code ${code}`));
    });
  });
}

function runPowerShell(script) {
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );

  return collectOutput(child);
}

function normalizeStatus(state, startupType) {
  const text = String(state || "").trim().toLowerCase();
  if (text.includes("running")) return "running";
  if (text.includes("pause")) return "paused";
  if (text.includes("start pending") || text.includes("starting")) return "starting";
  if (text.includes("stop pending") || text.includes("stopping")) return "stopping";
  if (text.includes("stopped")) return startupType === "disabled" ? "disabled" : "stopped";
  if (startupType === "disabled") return "disabled";
  return "unknown";
}

function statusLabelFor(status) {
  switch (status) {
    case "running":
      return "Running";
    case "paused":
      return "Paused";
    case "starting":
      return "Starting";
    case "stopping":
      return "Stopping";
    case "stopped":
      return "Stopped";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
}

function normalizeStartupType(startMode, delayedAutoStart) {
  const text = String(startMode || "").trim().toLowerCase();
  if (text === "auto") return delayedAutoStart ? "automatic_delayed" : "automatic";
  if (text === "manual") return "manual";
  if (text === "disabled") return "disabled";
  if (text === "boot" || text === "system") return "automatic";
  return "unknown";
}

function startupLabelFor(startupType) {
  switch (startupType) {
    case "automatic":
      return "Automatic";
    case "automatic_delayed":
      return "Automatic delayed";
    case "manual":
      return "Manual";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
}

function contextLabelFor(startName) {
  const normalized = String(startName || "").trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower === "localsystem") return "Local System";
  if (lower === "nt authority\\localservice") return "Local Service";
  if (lower === "nt authority\\networkservice") return "Network Service";
  if (lower.startsWith("nt service\\")) return "Service account";
  return normalized;
}

function statusRank(status) {
  return STATUS_RANK[status] ?? STATUS_RANK.unknown;
}

function startupRank(startupType) {
  return STARTUP_RANK[startupType] ?? STARTUP_RANK.unknown;
}

function compareServices(left, right) {
  return (
    statusRank(left.status) - statusRank(right.status) ||
    String(left.displayName || "").localeCompare(String(right.displayName || "")) ||
    String(left.serviceName || "").localeCompare(String(right.serviceName || ""))
  );
}

export async function loadWindowsServices() {
  const capturedAt = new Date().toISOString();

  if (process.platform !== "win32") {
    return {
      ok: false,
      capturedAt,
      source: "powershell-cim",
      totalCount: 0,
      rows: [],
      error: "Windows services are only available on Windows.",
    };
  }

  const script = `
$ErrorActionPreference = 'Stop'
Get-CimInstance Win32_Service |
  Select-Object Name, DisplayName, State, StartMode, Description, StartName, DelayedAutoStart |
  ConvertTo-Json -Depth 4 -Compress
`.trim();

  try {
    const { stdout } = await runPowerShell(script);
    const parsed = stdout ? JSON.parse(stdout) : [];
    const rawServices = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];

    const rows = rawServices
      .map((entry) => {
        const serviceName = String(entry?.Name || "").trim();
        const displayName = String(entry?.DisplayName || serviceName || "Unnamed service").trim();
        const startupType = normalizeStartupType(entry?.StartMode, Boolean(entry?.DelayedAutoStart));
        const status = normalizeStatus(entry?.State, startupType);
        const contextLabel = contextLabelFor(entry?.StartName);
        const description = String(entry?.Description || "").trim();

        return {
          id: serviceName || displayName,
          displayName,
          serviceName: serviceName || displayName,
          status,
          statusLabel: statusLabelFor(status),
          startupType,
          startupLabel: startupLabelFor(startupType),
          description: description || null,
          contextLabel,
          iconKey: (displayName || serviceName || "S").trim().slice(0, 1).toUpperCase(),
          searchText: [displayName, serviceName, statusLabelFor(status), startupLabelFor(startupType), description, contextLabel]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          statusRank: statusRank(status),
          startupRank: startupRank(startupType),
        };
      })
      .filter((row) => row.id)
      .sort(compareServices);

    return {
      ok: true,
      capturedAt,
      source: "powershell-cim",
      totalCount: rows.length,
      rows,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      capturedAt,
      source: "powershell-cim",
      totalCount: 0,
      rows: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}