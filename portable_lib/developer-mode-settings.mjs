import fs from "node:fs";
import path from "node:path";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const SETTINGS_PATH = getTaskmanagerPaths().brain.runtime.developerModeSettingsFile;

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  snapshot: {
    pollMs: 2500,
  },
  logs: {
    pollMs: 1500,
    limit: 120,
    source: "all",
  },
  chat: {
    streaming: true,
    localLlm: true,
    internet: false,
    profileName: "repo-knowledge-pack",
  },
  ui: {
    density: "compact",
    defaultInspector: "pipeline",
    defaultLogSource: "all",
  },
  features: {
    pipelineInspector: true,
    stateInspector: true,
    implementationMonitor: true,
    runtimePanel: true,
    workerPanel: true,
  },
  debug: {
    forceDryRun: true,
    verboseDiagnostics: true,
    showRawPayloads: true,
    showExperimental: true,
    simulateWarnings: false,
    simulateHotspots: false,
  },
});

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function ensureSettingsDir() {
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

function sanitizeEnum(value, supported, fallback) {
  return supported.includes(value) ? value : fallback;
}

function sanitizeSettings(input) {
  const merged = mergeSettings(cloneDefaults(), input || {});

  return {
    enabled: merged.enabled !== false,
    snapshot: {
      pollMs: Math.max(500, asFiniteNumber(merged.snapshot?.pollMs, DEFAULT_SETTINGS.snapshot.pollMs)),
    },
    logs: {
      pollMs: Math.max(500, asFiniteNumber(merged.logs?.pollMs, DEFAULT_SETTINGS.logs.pollMs)),
      limit: Math.max(20, Math.min(400, asFiniteNumber(merged.logs?.limit, DEFAULT_SETTINGS.logs.limit))),
      source: sanitizeEnum(merged.logs?.source, ["all", "audit", "chat", "workspace", "activity"], DEFAULT_SETTINGS.logs.source),
    },
    chat: {
      streaming: merged.chat?.streaming !== false,
      localLlm: merged.chat?.localLlm !== false,
      internet: merged.chat?.internet === true,
      profileName:
        typeof merged.chat?.profileName === "string" && merged.chat.profileName.trim()
          ? merged.chat.profileName.trim()
          : DEFAULT_SETTINGS.chat.profileName,
    },
    ui: {
      density: sanitizeEnum(merged.ui?.density, ["compact", "comfortable"], DEFAULT_SETTINGS.ui.density),
      defaultInspector: sanitizeEnum(
        merged.ui?.defaultInspector,
        ["pipeline", "snapshot", "task-manager", "runtime", "flags"],
        DEFAULT_SETTINGS.ui.defaultInspector
      ),
      defaultLogSource: sanitizeEnum(
        merged.ui?.defaultLogSource,
        ["all", "audit", "chat", "workspace", "activity"],
        DEFAULT_SETTINGS.ui.defaultLogSource
      ),
    },
    features: {
      pipelineInspector: merged.features?.pipelineInspector !== false,
      stateInspector: merged.features?.stateInspector !== false,
      implementationMonitor: merged.features?.implementationMonitor !== false,
      runtimePanel: merged.features?.runtimePanel !== false,
      workerPanel: merged.features?.workerPanel !== false,
    },
    debug: {
      forceDryRun: merged.debug?.forceDryRun !== false,
      verboseDiagnostics: merged.debug?.verboseDiagnostics !== false,
      showRawPayloads: merged.debug?.showRawPayloads !== false,
      showExperimental: merged.debug?.showExperimental !== false,
      simulateWarnings: merged.debug?.simulateWarnings === true,
      simulateHotspots: merged.debug?.simulateHotspots === true,
    },
  };
}

export function getDeveloperModeSettingsPath() {
  return SETTINGS_PATH;
}

export function readDeveloperModeSettings() {
  ensureSettingsDir();
  if (!fs.existsSync(SETTINGS_PATH)) {
    return cloneDefaults();
  }

  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return sanitizeSettings(parsed);
  } catch {
    return cloneDefaults();
  }
}

export function writeDeveloperModeSettings(nextSettings) {
  ensureSettingsDir();
  const sanitized = sanitizeSettings(nextSettings);
  fs.writeFileSync(SETTINGS_PATH, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  return sanitized;
}

export function updateDeveloperModeSettings(patch) {
  return writeDeveloperModeSettings(mergeSettings(readDeveloperModeSettings(), patch || {}));
}
