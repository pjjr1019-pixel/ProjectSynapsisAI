import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { detectBrainDrift } from "./brain-drift-detector.mjs";
import { ensureBrainRuntimeHub, getBrainRuntimeHubPaths } from "./brain-runtime-hub.mjs";
import { writeJsonStable } from "./brain-build-utils.mjs";

const DEFAULT_INTERVAL_MINUTES = 60;
const MIN_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 24 * 60;
const SCRIPT_PATHS = [
  "scripts/ingest-live-financial.mjs",
  "scripts/ingest-live-intel.mjs",
];

const runtimeState = {
  started: false,
  timer: null,
  active: false,
  logger: console,
};

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function resolveIntervalMinutes() {
  const raw = Number(process.env.HORIZONS_LIVE_INGESTION_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES);
  if (!Number.isFinite(raw)) return DEFAULT_INTERVAL_MINUTES;
  return Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, Math.round(raw)));
}

function getStatusPath() {
  const paths = ensureBrainRuntimeHub();
  return path.join(paths.settingsRoot, "live-ingestion-status.json");
}

function nowIso() {
  return new Date().toISOString();
}

function defaultStatus() {
  return {
    active: false,
    lastRunStartedAt: null,
    lastRunFinishedAt: null,
    lastRunReason: null,
    lastImportedCount: 0,
    lastFinancialImportedCount: 0,
    lastIntelImportedCount: 0,
    staleLiveIssueCount: 0,
    staleLiveHighSeverityCount: 0,
    lastError: null,
    updatedAt: nowIso(),
  };
}

function readStatus() {
  const statusPath = getStatusPath();
  if (!fs.existsSync(statusPath)) return defaultStatus();
  try {
    return {
      ...defaultStatus(),
      ...JSON.parse(fs.readFileSync(statusPath, "utf8")),
    };
  } catch {
    return defaultStatus();
  }
}

function writeStatus(patch = {}) {
  const next = {
    ...readStatus(),
    ...patch,
    updatedAt: nowIso(),
  };
  writeJsonStable(getStatusPath(), next);
  return next;
}

function parseStructuredStdout(stdout) {
  const raw = String(stdout || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}$/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function runNodeScript(scriptPath, logger) {
  const { repoRoot } = getBrainRuntimeHubPaths();
  const absoluteScriptPath = path.join(repoRoot, scriptPath);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(process.execPath, [absoluteScriptPath], {
      cwd: repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      if (text.trim()) {
        logger.warn?.(`[live-ingestion] ${path.basename(scriptPath)}: ${text.trim()}`);
      }
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`${path.basename(scriptPath)} exited with code ${code}. ${stderr.trim()}`.trim()));
        return;
      }

      const parsed = parseStructuredStdout(stdout);
      const imported = Array.isArray(parsed?.imported) ? parsed.imported : [];
      resolve({
        scriptPath,
        imported,
        importedCount: imported.length,
        stdout: stdout.trim(),
      });
    });
  });
}

function summarizeDrift() {
  try {
    const report = detectBrainDrift();
    const staleLiveIssues = (report.issues || []).filter((row) => row?.code === "stale_live_import");
    return {
      staleLiveIssueCount: staleLiveIssues.length,
      staleLiveHighSeverityCount: staleLiveIssues.filter((row) => row?.severity === "high").length,
    };
  } catch (error) {
    return {
      staleLiveIssueCount: 0,
      staleLiveHighSeverityCount: 0,
      driftError: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getIngestionSnapshot() {
  const status = readStatus();
  return {
    available: true,
    enabled: envFlag("HORIZONS_LIVE_INGESTION_ENABLED", false),
    intervalMinutes: resolveIntervalMinutes(),
    active: runtimeState.active || status.active === true,
    lastRunStartedAt: status.lastRunStartedAt,
    lastRunFinishedAt: status.lastRunFinishedAt,
    lastRunReason: status.lastRunReason,
    lastImportedCount: Number(status.lastImportedCount || 0),
    lastFinancialImportedCount: Number(status.lastFinancialImportedCount || 0),
    lastIntelImportedCount: Number(status.lastIntelImportedCount || 0),
    staleLiveIssueCount: Number(status.staleLiveIssueCount || 0),
    staleLiveHighSeverityCount: Number(status.staleLiveHighSeverityCount || 0),
    lastError: status.lastError || null,
  };
}

export async function runIngestionCycle(opts = {}) {
  const logger = opts.logger || runtimeState.logger || console;
  if (runtimeState.active) {
    return {
      skipped: "already_running",
      ...getIngestionSnapshot(),
    };
  }

  runtimeState.active = true;
  const startedAt = nowIso();
  writeStatus({
    active: true,
    lastRunStartedAt: startedAt,
    lastRunReason: opts.reason || "manual",
    lastError: null,
  });

  try {
    const [financial, intel] = await Promise.all(
      SCRIPT_PATHS.map((scriptPath) => runNodeScript(scriptPath, logger))
    );
    const drift = summarizeDrift();
    const finishedAt = nowIso();
    const status = writeStatus({
      active: false,
      lastRunFinishedAt: finishedAt,
      lastRunReason: opts.reason || "manual",
      lastImportedCount: financial.importedCount + intel.importedCount,
      lastFinancialImportedCount: financial.importedCount,
      lastIntelImportedCount: intel.importedCount,
      staleLiveIssueCount: drift.staleLiveIssueCount,
      staleLiveHighSeverityCount: drift.staleLiveHighSeverityCount,
      lastError: drift.driftError || null,
    });
    runtimeState.active = false;
    return {
      startedAt,
      finishedAt,
      financialImportedCount: financial.importedCount,
      intelImportedCount: intel.importedCount,
      staleLiveIssueCount: drift.staleLiveIssueCount,
      staleLiveHighSeverityCount: drift.staleLiveHighSeverityCount,
      ...getIngestionSnapshot(),
      status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeStatus({
      active: false,
      lastRunFinishedAt: nowIso(),
      lastRunReason: opts.reason || "manual",
      lastError: message,
    });
    runtimeState.active = false;
    return {
      error: message,
      ...getIngestionSnapshot(),
    };
  }
}

export function startIngestionWorker(opts = {}) {
  if (runtimeState.started) return getIngestionSnapshot();
  runtimeState.started = true;
  runtimeState.logger = opts.logger || console;
  ensureBrainRuntimeHub();

  if (!envFlag("HORIZONS_LIVE_INGESTION_ENABLED", false)) {
    writeStatus({
      active: false,
      lastError: null,
    });
    return getIngestionSnapshot();
  }

  const intervalMinutes = resolveIntervalMinutes();
  runtimeState.timer = setInterval(() => {
    void runIngestionCycle({
      logger: runtimeState.logger,
      reason: "scheduled",
    }).then((result) => {
      if (result?.error) {
        runtimeState.logger.error?.(`[live-ingestion] ${result.error}`);
      }
    });
  }, intervalMinutes * 60 * 1000);

  if (typeof runtimeState.timer.unref === "function") {
    runtimeState.timer.unref();
  }

  return getIngestionSnapshot();
}
