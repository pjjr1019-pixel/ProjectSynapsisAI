import fs from "node:fs";
import path from "node:path";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const SETTINGS_PATH = getTaskmanagerPaths().brain.runtime.optimizerSettingsFile;

export const OPTIMIZER_PERFORMANCE_MODES = Object.freeze([
  "max-performance",
  "balanced",
  "low-resource",
  "background-maintenance",
  "emergency",
]);

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  killSwitchActive: false,
  performanceMode: "balanced",
  intervalMs: {
    low: 60_000,
    moderate: 15_000,
    high: 5_000,
    critical: 5_000,
    active: 30_000,
  },
  thresholds: {
    autoMinConfidence: 75,
    recommendMinConfidence: 45,
    approveMinConfidence: 25,
  },
  budgets: {
    ramReservedMB: 2048,
    vramReservedMB: 4096,
    backgroundCpuMaxPercent: 25,
  },
  cooldowns: {
    pauseCrawlerMs: 300_000,
    evictCacheMs: 900_000,
    rollbackMs: 900_000,
  },
  pinnedModules: [],
  ignoredModules: [],
  autoTierDisabledActions: [],
});

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function ensureSettingsDirectory() {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
}

function asFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mergeSettings(base, patch) {
  const merged = { ...base };

  for (const [key, value] of Object.entries(patch || {})) {
    if (Array.isArray(value)) {
      merged[key] = [...value];
      continue;
    }
    if (value && typeof value === "object") {
      merged[key] = mergeSettings(
        base && typeof base[key] === "object" && !Array.isArray(base[key]) ? base[key] : {},
        value
      );
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function sanitizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
}

function sanitizeSettings(input) {
  const merged = mergeSettings(cloneDefaultSettings(), input || {});
  const performanceMode = OPTIMIZER_PERFORMANCE_MODES.includes(merged.performanceMode)
    ? merged.performanceMode
    : "balanced";

  return {
    enabled: merged.enabled !== false,
    killSwitchActive: merged.killSwitchActive === true,
    performanceMode,
    intervalMs: {
      low: Math.max(1000, asFiniteNumber(merged.intervalMs?.low, DEFAULT_SETTINGS.intervalMs.low)),
      moderate: Math.max(1000, asFiniteNumber(merged.intervalMs?.moderate, DEFAULT_SETTINGS.intervalMs.moderate)),
      high: Math.max(1000, asFiniteNumber(merged.intervalMs?.high, DEFAULT_SETTINGS.intervalMs.high)),
      critical: Math.max(1000, asFiniteNumber(merged.intervalMs?.critical, DEFAULT_SETTINGS.intervalMs.critical)),
      active: Math.max(1000, asFiniteNumber(merged.intervalMs?.active, DEFAULT_SETTINGS.intervalMs.active)),
    },
    thresholds: {
      autoMinConfidence: Math.max(0, Math.min(100, asFiniteNumber(merged.thresholds?.autoMinConfidence, DEFAULT_SETTINGS.thresholds.autoMinConfidence))),
      recommendMinConfidence: Math.max(
        0,
        Math.min(100, asFiniteNumber(merged.thresholds?.recommendMinConfidence, DEFAULT_SETTINGS.thresholds.recommendMinConfidence))
      ),
      approveMinConfidence: Math.max(
        0,
        Math.min(100, asFiniteNumber(merged.thresholds?.approveMinConfidence, DEFAULT_SETTINGS.thresholds.approveMinConfidence))
      ),
    },
    budgets: {
      ramReservedMB: Math.max(0, asFiniteNumber(merged.budgets?.ramReservedMB, DEFAULT_SETTINGS.budgets.ramReservedMB)),
      vramReservedMB: Math.max(0, asFiniteNumber(merged.budgets?.vramReservedMB, DEFAULT_SETTINGS.budgets.vramReservedMB)),
      backgroundCpuMaxPercent: Math.max(
        0,
        Math.min(100, asFiniteNumber(merged.budgets?.backgroundCpuMaxPercent, DEFAULT_SETTINGS.budgets.backgroundCpuMaxPercent))
      ),
    },
    cooldowns: {
      pauseCrawlerMs: Math.max(0, asFiniteNumber(merged.cooldowns?.pauseCrawlerMs, DEFAULT_SETTINGS.cooldowns.pauseCrawlerMs)),
      evictCacheMs: Math.max(0, asFiniteNumber(merged.cooldowns?.evictCacheMs, DEFAULT_SETTINGS.cooldowns.evictCacheMs)),
      rollbackMs: Math.max(0, asFiniteNumber(merged.cooldowns?.rollbackMs, DEFAULT_SETTINGS.cooldowns.rollbackMs)),
    },
    pinnedModules: sanitizeStringList(merged.pinnedModules),
    ignoredModules: sanitizeStringList(merged.ignoredModules),
    autoTierDisabledActions: sanitizeStringList(merged.autoTierDisabledActions),
  };
}

export function getOptimizerSettingsPath() {
  return SETTINGS_PATH;
}

export function readOptimizerSettings() {
  ensureSettingsDirectory();
  if (!fs.existsSync(SETTINGS_PATH)) {
    return cloneDefaultSettings();
  }

  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = raw ? JSON.parse(raw) : {};
    return sanitizeSettings(parsed);
  } catch {
    return cloneDefaultSettings();
  }
}

export function writeOptimizerSettings(nextSettings) {
  ensureSettingsDirectory();
  const sanitized = sanitizeSettings(nextSettings);
  fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  return sanitized;
}

export function updateOptimizerSettings(patch) {
  const current = readOptimizerSettings();
  return writeOptimizerSettings(mergeSettings(current, patch || {}));
}

export function setOptimizerKillSwitch(active) {
  return updateOptimizerSettings({ killSwitchActive: Boolean(active) });
}

export function setOptimizerPerformanceMode(mode) {
  const normalized = String(mode || "").trim();
  if (!OPTIMIZER_PERFORMANCE_MODES.includes(normalized)) {
    throw new Error(`Unsupported optimizer performance mode: ${normalized || "unknown"}`);
  }
  return updateOptimizerSettings({ performanceMode: normalized });
}

export function setOptimizerModulePolicy(moduleId, patch = {}) {
  const id = String(moduleId || "").trim();
  if (!id) throw new Error("A moduleId is required.");

  const current = readOptimizerSettings();
  const pinned = new Set(current.pinnedModules);
  const ignored = new Set(current.ignoredModules);

  if (typeof patch.pinned === "boolean") {
    if (patch.pinned) pinned.add(id);
    else pinned.delete(id);
  }

  if (typeof patch.ignored === "boolean") {
    if (patch.ignored) ignored.add(id);
    else ignored.delete(id);
  }

  return writeOptimizerSettings({
    ...current,
    pinnedModules: [...pinned].sort(),
    ignoredModules: [...ignored].sort(),
  });
}
