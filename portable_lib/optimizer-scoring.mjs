/**
 * Optimizer Scoring Functions
 *
 * All scoring functions are pure (no side effects, no I/O).
 * Scores are integers 0–100 (higher = more of the quality described).
 *
 * All functions accept a module registry entry and optionally a telemetry snapshot.
 * They must never throw — invalid inputs return sensible defaults.
 */

import { ModuleType, ProtectionLevel } from "./optimizer-registry.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function secsSince(timestamp) {
  if (!timestamp) return Infinity;
  return Math.max(0, (Date.now() - timestamp) / 1000);
}

// ---------------------------------------------------------------------------
// 1. Idle Score (0 = busy, 100 = completely idle)
// ---------------------------------------------------------------------------

/**
 * How idle is this module right now?
 * Based on time since lastActiveAt.
 *
 * @param {object} module  Registry entry
 * @param {number} [nowMs] Optional override for current time (testing)
 * @returns {number} 0–100
 */
export function idleScore(module, nowMs = Date.now()) {
  if (!module) return 0;

  const secs = Math.max(0, (nowMs - (module.lastActiveAt || nowMs)) / 1000);

  if (secs < 30) return 0;
  if (secs < 120) return 20;    // 30s–2min: slightly idle
  if (secs < 600) return 50;    // 2–10min: noticeably idle
  if (secs < 3600) return 75;   // 10min–1hr: idle
  // > 1hr: increasingly idle, cap at 95
  return clamp(90 + Math.min(10, ((secs - 3600) / 3600) * 10));
}

// ---------------------------------------------------------------------------
// 2. Staleness Score (0 = fresh, 100 = completely stale)
// ---------------------------------------------------------------------------

/**
 * How stale is this module's last meaningful output?
 * Based on time since lastMeaningfulWorkAt.
 *
 * @param {object} module
 * @param {number} [nowMs]
 * @returns {number} 0–100
 */
export function stalenessScore(module, nowMs = Date.now()) {
  if (!module) return 0;

  const secs = Math.max(0, (nowMs - (module.lastMeaningfulWorkAt || module.lastActiveAt || nowMs)) / 1000);

  if (secs < 300) return 0;      // < 5 min: fresh
  if (secs < 1800) return 30;    // < 30 min: slightly stale
  if (secs < 7200) return 60;    // < 2 hr: stale
  if (secs < 86400) return 80;   // < 24 hr: very stale
  return 95;                      // > 24 hr: essentially dead
}

// ---------------------------------------------------------------------------
// 3. Value Score (0 = no value, 100 = critical)
// ---------------------------------------------------------------------------

/**
 * How valuable is this module to the app's core functionality?
 * Based on type hierarchy + recent activity boost.
 *
 * @param {object} module
 * @param {number} [nowMs]
 * @returns {number} 0–100
 */
export function valueScore(module, nowMs = Date.now()) {
  if (!module) return 0;

  const BASE = {
    [ModuleType.CHAT_PIPELINE]: 100,
    [ModuleType.LOCAL_LLM]: 95,
    [ModuleType.BRAIN_RUNTIME_CACHE]: 90,
    [ModuleType.SCENARIO_INDEX]: 85,
    [ModuleType.BM25_INDEX]: 80,
    [ModuleType.SESSION_STATE]: 75,
    [ModuleType.EMBEDDING_MODEL]: 60,
    [ModuleType.BRAIN_IR_BUILDER]: 50,
    [ModuleType.CRAWLER]: 40,
    [ModuleType.INGESTION_WORKER]: 35,
    [ModuleType.BROWSER_CACHE]: 30,
    [ModuleType.DIAGNOSTIC_JOB]: 20,
  };

  let base = BASE[module.type] ?? 30;

  // Boost if recently active (within 2 min)
  const idle = idleScore(module, nowMs);
  if (idle < 20) base = clamp(base + 15);

  // Penalize if stale
  const stale = stalenessScore(module, nowMs);
  if (stale > 80) base = clamp(base - 20);

  return clamp(base);
}

// ---------------------------------------------------------------------------
// 4. Waste Score (0 = justified, 100 = pure waste)
// ---------------------------------------------------------------------------

/**
 * How wasteful is keeping this module active?
 * High idle + high resource use + low session need = high waste.
 *
 * @param {object} module
 * @param {object} [telemetry]  Current telemetry snapshot
 * @param {object} [registryCounts]  { countActiveOfType }
 * @param {number} [nowMs]
 * @returns {number} 0–100
 */
export function wasteScore(module, telemetry = null, registryCounts = null, nowMs = Date.now()) {
  if (!module) return 0;

  const idle = idleScore(module, nowMs);
  const stale = stalenessScore(module, nowMs);

  // Base: 40% idle + 40% staleness
  let base = idle * 0.4 + stale * 0.4;

  // Penalize CPU/memory consumption during idleness
  const { cpuPercent = 0, memoryMB = 0 } = module.resourceHints || {};
  if (cpuPercent > 5 && idle > 50) base += 15;
  if (memoryMB > 200 && idle > 70) base += 15;

  // Strong penalty: background work during active session
  const sessionMode = telemetry?.sessionMode ?? "background";
  if (sessionMode === "active") {
    if (module.type === ModuleType.CRAWLER) base += 25;
    if (module.type === ModuleType.INGESTION_WORKER) base += 20;
    if (module.type === ModuleType.DIAGNOSTIC_JOB) base += 20;
  }

  // Penalize duplicate workers of the same type
  if (registryCounts && typeof registryCounts.countActiveOfType === "function") {
    const activeCount = registryCounts.countActiveOfType(module.type);
    if (activeCount > 1 && module.type === ModuleType.INGESTION_WORKER) base += 10;
    if (activeCount > 2 && module.type === ModuleType.CRAWLER) base += 8;
  }

  return clamp(base);
}

// ---------------------------------------------------------------------------
// 5. Keep-Warm Score (0 = safe to unload, 100 = must stay loaded)
// ---------------------------------------------------------------------------

/**
 * How important is it to keep this module warm (loaded in memory)?
 *
 * @param {object} module
 * @param {object} [telemetry]
 * @param {number} [nowMs]
 * @returns {number} 0–100
 */
export function keepWarmScore(module, telemetry = null, nowMs = Date.now()) {
  if (!module) return 0;

  // Pinned or never-auto-touch = always warm
  if (module.pinned || module.neverAutoTouch) return 100;

  // Critical protection = always warm
  if (module.protectionLevel === ProtectionLevel.CRITICAL) return 100;

  // Core runtime = very warm
  if (module.type === ModuleType.BRAIN_RUNTIME_CACHE) return 85;

  const v = valueScore(module, nowMs);
  const idle = idleScore(module, nowMs);

  // High value + recently used = keep warm
  if (v >= 80 && idle < 40) return clamp(80 + (40 - idle));

  // High value + idle = gradually release warmth
  if (v >= 80 && idle >= 70) return 40;

  // Low value + idle = release
  if (v < 40 && idle >= 60) return 10;

  // General formula: value minus half of idle score
  return clamp(v - idle * 0.5);
}

// ---------------------------------------------------------------------------
// 6. Risk Score (0 = safe action, 100 = dangerous)
// ---------------------------------------------------------------------------

/**
 * How risky is the proposed action on this module right now?
 *
 * @param {string} action       Action name
 * @param {object} module       Registry entry
 * @param {object} [telemetry]  Current telemetry
 * @returns {number} 0–100
 */
export function riskScore(action, module, telemetry = null) {
  if (!action || !module) return 100;  // Unknown = max risk

  const BASE_RISK = {
    "observe": 0,
    "lower-priority": 5,
    "delay-task": 5,
    "pause-crawler": 10,
    "defer-rebuild": 10,
    "resume-crawler": 5,
    "lower-fetch-workers": 8,
    "evict-browser-cache": 10,
    "cancel-diagnostic": 12,
    "pause-all-crawlers": 15,
    "unload-browser-cache": 10,
    "unload-cache": 20,
    "suspend-worker": 25,
    "kill-ingestion-worker": 35,
    "restart-worker": 40,
    "unload-embedding-model": 50,
    "unload-local-llm": 80,
  };

  let base = BASE_RISK[action] ?? 80;

  // Increase risk if module is protected
  if (module.protectionLevel === ProtectionLevel.CRITICAL) base += 50;
  else if (module.protectionLevel === ProtectionLevel.HIGH) base += 25;
  else if (module.protectionLevel === ProtectionLevel.MEDIUM) base += 10;

  // Increase risk if action taken during active session
  const sessionMode = telemetry?.sessionMode ?? "background";
  if (sessionMode === "active") base += 20;

  // Increase risk if module was recently active (skip for very safe actions)
  if (base >= 10) {
    const idle = idleScore(module);
    if (idle < 30) base += 15;
  }

  return clamp(base);
}

// ---------------------------------------------------------------------------
// 7. Intervention Confidence Score (0 = uncertain, 100 = very confident)
// ---------------------------------------------------------------------------

/**
 * How confident should we be that intervening on this module is the right call?
 *
 * High idle + high waste + low value + no active session = high confidence.
 * Active session, protected module, or recently active = low confidence.
 *
 * @param {object} module
 * @param {object} [telemetry]
 * @param {string} [action]
 * @param {number} [nowMs]
 * @returns {number} 0–100
 */
export function interventionConfidence(module, telemetry = null, action = "observe", nowMs = Date.now()) {
  if (!module) return 0;

  // Never confident about critical modules
  if (module.neverAutoTouch || module.protectionLevel === ProtectionLevel.CRITICAL) return 0;
  if (module.ignored) return 0;

  const idle = idleScore(module, nowMs);
  const waste = wasteScore(module, telemetry, null, nowMs);
  const v = valueScore(module, nowMs);
  const risk = riskScore(action, module, telemetry);

  // Session penalty: active sessions suppress confidence
  const sessionMode = telemetry?.sessionMode ?? "background";
  const sessionPenalty = sessionMode === "active" ? 45 : sessionMode === "idle" ? 10 : 0;

  // Cooldown penalty
  const cooldownPenalty = module.actionCooldownUntil > nowMs ? 100 : 0;

  // Core formula: weighted average of positive signals minus risk/session/cooldown
  const raw =
    idle * 0.35 +
    waste * 0.35 +
    (100 - v) * 0.20 -
    risk * 0.10 -
    sessionPenalty -
    cooldownPenalty;

  return clamp(raw);
}

// ---------------------------------------------------------------------------
// 8. Resource Pressure Level
// ---------------------------------------------------------------------------

/**
 * Given a telemetry snapshot, return the overall pressure level.
 * This is a convenience re-export for modules that only import scoring.
 *
 * @param {object} telemetry
 * @returns {"low"|"moderate"|"high"|"critical"}
 */
export function overallPressureLevel(telemetry) {
  return telemetry?.pressure?.overall ?? "low";
}

// ---------------------------------------------------------------------------
// Batch scoring for a full registry
// ---------------------------------------------------------------------------

/**
 * Score all modules in a registry and return scored entries sorted by priority.
 *
 * @param {object[]} modules     Array of registry entries
 * @param {object} telemetry     Current telemetry snapshot
 * @param {number} [nowMs]
 * @returns {object[]}  Modules with added score fields, sorted by interventionConfidence desc
 */
export function scoreAllModules(modules, telemetry, nowMs = Date.now()) {
  return modules
    .map((m) => ({
      ...m,
      scores: {
        idle: idleScore(m, nowMs),
        staleness: stalenessScore(m, nowMs),
        value: valueScore(m, nowMs),
        waste: wasteScore(m, telemetry, null, nowMs),
        keepWarm: keepWarmScore(m, telemetry, nowMs),
        interventionConfidence: interventionConfidence(m, telemetry, "pause-crawler", nowMs),
      },
    }))
    .sort((a, b) => b.scores.interventionConfidence - a.scores.interventionConfidence);
}
