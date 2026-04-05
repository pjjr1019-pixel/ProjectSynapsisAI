/**
 * Optimizer Module Registry
 *
 * Tracks all known app-managed modules, workers, tasks, and model runtimes.
 * Each registered module has a type, protection level, state, activity timestamps,
 * and resource hints. The registry is the single source of truth for the optimizer.
 *
 * Rules:
 * - CRITICAL modules (chat-pipeline, local-llm) are never auto-acted upon.
 * - Pinned modules are treated as keep-warm regardless of idle scores.
 * - neverAutoTouch modules skip all action tiers except OBSERVE.
 */

import { getCrawlerIds } from "./brain-runtime-settings.mjs";
import { readOptimizerSettings } from "./optimizer-settings.mjs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ModuleType = Object.freeze({
  CHAT_PIPELINE: "chat-pipeline",
  BRAIN_RUNTIME_CACHE: "brain-runtime-cache",
  SCENARIO_INDEX: "scenario-index",
  BM25_INDEX: "bm25-index",
  EMBEDDING_MODEL: "embedding-model",
  LOCAL_LLM: "local-llm",
  CRAWLER: "crawler",
  INGESTION_WORKER: "ingestion-worker",
  BRAIN_IR_BUILDER: "brain-ir-builder",
  SESSION_STATE: "session-state",
  BROWSER_CACHE: "browser-cache",
  DIAGNOSTIC_JOB: "diagnostic-job",
});

export const ProtectionLevel = Object.freeze({
  CRITICAL: "critical",  // Never auto-touch. Never recommend without approval.
  HIGH: "high",          // Recommend only. Approve tier for any action.
  MEDIUM: "medium",      // AUTO allowed under high pressure with high confidence.
  LOW: "low",            // AUTO allowed under normal policy rules.
  NONE: "none",          // No special protection.
});

export const ModuleState = Object.freeze({
  INITIALIZING: "initializing",
  ACTIVE: "active",
  IDLE: "idle",
  SUSPENDED: "suspended",
  UNLOADED: "unloaded",
  FAILED: "failed",
  QUARANTINED: "quarantined",
});

export const ActionTier = Object.freeze({
  OBSERVE: 0,    // Log only. No action.
  AUTO: 1,       // Execute automatically when confidence >= threshold.
  RECOMMEND: 2,  // Show to user as suggestion.
  APPROVE: 3,    // Require explicit user confirmation.
  NEVER: 4,      // Hard block. Never execute.
});

// Default protection levels per module type
const DEFAULT_PROTECTION = {
  [ModuleType.CHAT_PIPELINE]: ProtectionLevel.CRITICAL,
  [ModuleType.LOCAL_LLM]: ProtectionLevel.CRITICAL,
  [ModuleType.BRAIN_RUNTIME_CACHE]: ProtectionLevel.HIGH,
  [ModuleType.SCENARIO_INDEX]: ProtectionLevel.HIGH,
  [ModuleType.SESSION_STATE]: ProtectionLevel.HIGH,
  [ModuleType.BM25_INDEX]: ProtectionLevel.MEDIUM,
  [ModuleType.EMBEDDING_MODEL]: ProtectionLevel.MEDIUM,
  [ModuleType.BROWSER_CACHE]: ProtectionLevel.NONE,
  [ModuleType.CRAWLER]: ProtectionLevel.LOW,
  [ModuleType.INGESTION_WORKER]: ProtectionLevel.LOW,
  [ModuleType.BRAIN_IR_BUILDER]: ProtectionLevel.LOW,
  [ModuleType.DIAGNOSTIC_JOB]: ProtectionLevel.NONE,
};

// These module types are never acted on automatically — the policy engine skips them
const NEVER_AUTO_TOUCH_TYPES = new Set([
  ModuleType.CHAT_PIPELINE,
  ModuleType.LOCAL_LLM,
]);

// ---------------------------------------------------------------------------
// Registry state
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} */
const registry = new Map();

// User preferences persisted in optimizer settings
const userPrefs = {
  pinnedModules: new Set(),
  ignoredModules: new Set(),
};

function syncEntryPreferences(entry) {
  return {
    ...entry,
    pinned: userPrefs.pinnedModules.has(entry.id),
    ignored: userPrefs.ignoredModules.has(entry.id),
  };
}

function syncRegistryPreferences() {
  for (const [id, entry] of registry.entries()) {
    registry.set(id, syncEntryPreferences(entry));
  }
}

// ---------------------------------------------------------------------------
// Registration helpers
// ---------------------------------------------------------------------------

function now() {
  return Date.now();
}

/**
 * Create a normalized module entry.
 * @param {string} id
 * @param {string} type  One of ModuleType values
 * @param {object} opts
 */
function buildEntry(id, type, opts = {}) {
  const ts = now();
  const protectionLevel = opts.protectionLevel ?? DEFAULT_PROTECTION[type] ?? ProtectionLevel.NONE;
  const neverAutoTouch = opts.neverAutoTouch ?? NEVER_AUTO_TOUCH_TYPES.has(type) ?? false;

  return {
    id: String(id),
    displayName: opts.displayName ?? String(id),
    type: String(type),
    protectionLevel,
    neverAutoTouch,
    state: opts.initialState ?? ModuleState.ACTIVE,
    lastActiveAt: ts,
    lastMeaningfulWorkAt: ts,
    registeredAt: ts,
    resourceHints: {
      cpuPercent: 0,
      memoryMB: 0,
      vramMB: 0,
      ...(opts.resourceHints || {}),
    },
    metadata: opts.metadata ?? {},
    pinned: userPrefs.pinnedModules.has(id),
    ignored: userPrefs.ignoredModules.has(id),
    actionCooldownUntil: 0,  // timestamp after which new actions are allowed
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a module in the registry. Idempotent — re-registration updates the entry.
 */
export function registerModule(id, type, opts = {}) {
  if (!id || typeof id !== "string") throw new Error("registerModule: id must be a non-empty string");
  if (!Object.values(ModuleType).includes(type)) throw new Error(`registerModule: unknown type "${type}"`);

  if (registry.has(id)) {
    // Update existing entry rather than replacing to preserve history
    const existing = registry.get(id);
    registry.set(id, syncEntryPreferences({
      ...existing,
      displayName: opts.displayName ?? existing.displayName,
      state: opts.initialState ?? existing.state,
      metadata: { ...existing.metadata, ...(opts.metadata || {}) },
      resourceHints: { ...existing.resourceHints, ...(opts.resourceHints || {}) },
    }));
  } else {
    registry.set(id, buildEntry(id, type, opts));
  }
  return registry.get(id);
}

/**
 * Remove a module from the registry.
 */
export function unregisterModule(id) {
  registry.delete(id);
}

/**
 * Update a module's state.
 */
export function updateModuleState(id, state, metadata = {}) {
  if (!registry.has(id)) return null;
  const entry = registry.get(id);
  registry.set(id, {
    ...entry,
    state,
    metadata: { ...entry.metadata, ...metadata },
  });
  return registry.get(id);
}

/**
 * Record module activity. Updates lastActiveAt and optionally lastMeaningfulWorkAt.
 * @param {string} id
 * @param {boolean} meaningful  If true, also updates lastMeaningfulWorkAt
 */
export function noteModuleActivity(id, meaningful = true) {
  if (!registry.has(id)) return;
  const entry = registry.get(id);
  const ts = now();
  registry.set(id, {
    ...entry,
    lastActiveAt: ts,
    lastMeaningfulWorkAt: meaningful ? ts : entry.lastMeaningfulWorkAt,
    state: entry.state === ModuleState.IDLE || entry.state === ModuleState.SUSPENDED
      ? ModuleState.ACTIVE
      : entry.state,
  });
}

/**
 * Update resource usage hints for a module.
 */
export function updateResourceHints(id, hints = {}) {
  if (!registry.has(id)) return;
  const entry = registry.get(id);
  registry.set(id, {
    ...entry,
    resourceHints: {
      ...entry.resourceHints,
      cpuPercent: hints.cpuPercent ?? entry.resourceHints.cpuPercent,
      memoryMB: hints.memoryMB ?? entry.resourceHints.memoryMB,
      vramMB: hints.vramMB ?? entry.resourceHints.vramMB,
    },
  });
}

/**
 * Set cooldown on a module — no actions will be generated until cooldownUntil passes.
 */
export function setModuleCooldown(id, durationMs) {
  if (!registry.has(id)) return;
  const entry = registry.get(id);
  registry.set(id, {
    ...entry,
    actionCooldownUntil: now() + durationMs,
  });
}

/**
 * Check if a module is in cooldown.
 */
export function isModuleInCooldown(id) {
  const entry = registry.get(id);
  if (!entry) return false;
  return entry.actionCooldownUntil > now();
}

/**
 * Retrieve a single module by ID.
 */
export function getModule(id) {
  return registry.get(id) ?? null;
}

/**
 * Retrieve all registered modules.
 * @returns {object[]}
 */
export function getAllModules() {
  return [...registry.values()];
}

/**
 * Retrieve all modules of a given type.
 */
export function getModulesOfType(type) {
  return [...registry.values()].filter((m) => m.type === type);
}

/**
 * Count active modules of a given type.
 */
export function countActiveOfType(type) {
  return getModulesOfType(type).filter(
    (m) => m.state === ModuleState.ACTIVE || m.state === ModuleState.INITIALIZING
  ).length;
}

/**
 * Pin a module — marks it as keep-warm, suppresses hibernation suggestions.
 */
export function pinModule(id) {
  userPrefs.pinnedModules.add(id);
  if (registry.has(id)) {
    const entry = registry.get(id);
    registry.set(id, syncEntryPreferences(entry));
  }
}

/**
 * Unpin a module.
 */
export function unpinModule(id) {
  userPrefs.pinnedModules.delete(id);
  if (registry.has(id)) {
    const entry = registry.get(id);
    registry.set(id, syncEntryPreferences(entry));
  }
}

/**
 * Ignore a module — suppress all recommendations for it.
 */
export function ignoreModule(id) {
  userPrefs.ignoredModules.add(id);
  if (registry.has(id)) {
    const entry = registry.get(id);
    registry.set(id, syncEntryPreferences(entry));
  }
}

export function unignoreModule(id) {
  userPrefs.ignoredModules.delete(id);
  if (registry.has(id)) {
    const entry = registry.get(id);
    registry.set(id, syncEntryPreferences(entry));
  }
}

export function setModulePolicy(id, patch = {}) {
  if (typeof patch.pinned === "boolean") {
    if (patch.pinned) pinModule(id);
    else unpinModule(id);
  }
  if (typeof patch.ignored === "boolean") {
    if (patch.ignored) ignoreModule(id);
    else unignoreModule(id);
  }
  return getModule(id);
}

export function applyOptimizerPreferences(prefs = {}) {
  userPrefs.pinnedModules = new Set(
    Array.isArray(prefs.pinnedModules) ? prefs.pinnedModules.map(String).filter(Boolean) : []
  );
  userPrefs.ignoredModules = new Set(
    Array.isArray(prefs.ignoredModules) ? prefs.ignoredModules.map(String).filter(Boolean) : []
  );
  syncRegistryPreferences();
  return getOptimizerPreferences();
}

export function getOptimizerPreferences() {
  return {
    pinnedModules: [...userPrefs.pinnedModules].sort(),
    ignoredModules: [...userPrefs.ignoredModules].sort(),
  };
}

/**
 * Summary stats for telemetry.
 */
export function getRegistrySummary() {
  const modules = getAllModules();
  const countByState = {};
  for (const m of modules) {
    countByState[m.state] = (countByState[m.state] || 0) + 1;
  }
  return {
    totalModules: modules.length,
    activeModules: countByState[ModuleState.ACTIVE] ?? 0,
    idleModules: countByState[ModuleState.IDLE] ?? 0,
    suspendedModules: countByState[ModuleState.SUSPENDED] ?? 0,
    failedModules: countByState[ModuleState.FAILED] ?? 0,
    unloadedModules: countByState[ModuleState.UNLOADED] ?? 0,
  };
}

/**
 * Clear the registry (primarily for testing).
 */
export function clearRegistry() {
  registry.clear();
}

// ---------------------------------------------------------------------------
// Bootstrap: register well-known app modules
// ---------------------------------------------------------------------------

/**
 * Initialize the registry with the known Horizons.AI modules.
 * Called once at server startup from optimizer-control-loop.mjs.
 *
 * @param {object} opts
 * @param {string[]} [opts.crawlerIds]  List of crawler IDs to register
 */
export function initializeRegistry(opts = {}) {
  const optimizerSettings = opts.optimizerSettings ?? safeReadOptimizerSettings();
  applyOptimizerPreferences(optimizerSettings);

  const crawlerIds =
    Array.isArray(opts.crawlerIds) && opts.crawlerIds.length
      ? opts.crawlerIds
      : getCrawlerIds();

  // Core AI (never auto-touch)
  registerModule("chat-pipeline", ModuleType.CHAT_PIPELINE, {
    displayName: "Chat Pipeline",
    neverAutoTouch: true,
  });

  // Core runtime caches
  registerModule("brain-runtime-cache", ModuleType.BRAIN_RUNTIME_CACHE, {
    displayName: "Brain Runtime Cache",
  });
  registerModule("scenario-index", ModuleType.SCENARIO_INDEX, {
    displayName: "Scenario Index (Aho-Corasick)",
  });
  registerModule("bm25-index-default", ModuleType.BM25_INDEX, {
    displayName: "BM25 Index (default scope)",
  });
  registerModule("bm25-index-full", ModuleType.BM25_INDEX, {
    displayName: "BM25 Index (full scope)",
  });

  // Crawlers
  for (const crawlerId of crawlerIds) {
    registerModule(crawlerId, ModuleType.CRAWLER, {
      displayName: `Crawler ${crawlerId}`,
      initialState: ModuleState.IDLE,
    });
  }

  // Optional local LLM (registered as unloaded until confirmed active)
  registerModule("local-llm", ModuleType.LOCAL_LLM, {
    displayName: "Local LLM Runtime",
    initialState: ModuleState.UNLOADED,
    neverAutoTouch: true,
  });

  // Embedding model
  registerModule("embedding-model", ModuleType.EMBEDDING_MODEL, {
    displayName: "Embedding Model (bge-small-en-v1.5)",
    initialState: ModuleState.UNLOADED,
  });
}

function safeReadOptimizerSettings() {
  try {
    return readOptimizerSettings();
  } catch {
    return { pinnedModules: [], ignoredModules: [] };
  }
}
