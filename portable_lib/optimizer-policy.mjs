/**
 * Optimizer Policy Engine
 *
 * Two tiers of authority:
 *
 * Layer 1 — Hard Safety Rules (evaluateHardRules)
 *   Immutable rules that cannot be overridden by configuration or AI advisory.
 *   Any violation blocks the action entirely.
 *
 * Layer 2 — Policy Rules (evaluatePolicy)
 *   Deterministic rules that evaluate modules against current telemetry
 *   and generate typed action candidates with tier, confidence, and reason.
 *
 * All functions are pure — no I/O, no side effects.
 * The control loop calls these, then filters candidates through gateAction,
 * then passes approved candidates to optimizer-actions.mjs.
 */

import {
  ActionTier,
  ModuleType,
  ProtectionLevel,
} from "./optimizer-registry.mjs";
import {
  idleScore,
  stalenessScore,
  valueScore,
  wasteScore,
  riskScore,
  interventionConfidence,
} from "./optimizer-scoring.mjs";

// ---------------------------------------------------------------------------
// Layer 1: Hard Safety Rules
// ---------------------------------------------------------------------------

/**
 * Definitions of hard safety rules.
 * Each rule is: { id, description, check(action, module, telemetry) → bool (true = violation) }
 */
const HARD_RULES = [
  {
    id: "H-01",
    description: "Never take action on chat-pipeline",
    check: (action, module) =>
      module?.type === ModuleType.CHAT_PIPELINE && action !== "observe",
  },
  {
    id: "H-02",
    description: "Never auto-unload local-llm",
    check: (action, module) =>
      module?.type === ModuleType.LOCAL_LLM &&
      ["unload-local-llm", "suspend-worker", "kill-ingestion-worker", "restart-worker"].includes(action),
  },
  {
    id: "H-03",
    description: "No AUTO action during active session (except safe exceptions)",
    check: (action, module, telemetry, tier) => {
      const SAFE_DURING_ACTIVE = new Set(["pause-crawler", "cancel-diagnostic", "observe", "defer-rebuild"]);
      return (
        telemetry?.sessionMode === "active" &&
        tier === ActionTier.AUTO &&
        !SAFE_DURING_ACTIVE.has(action)
      );
    },
  },
  {
    id: "H-04",
    description: "Never touch Windows OS / security / driver processes",
    check: (action, module) =>
      module?.type === "os-process" &&
      ["os_core", "security", "driver"].includes(module?.metadata?.osClass) &&
      action !== "observe",
  },
  {
    id: "H-05",
    description: "Unknown processes: observe only",
    check: (action, module) =>
      module?.metadata?.osClass === "UNKNOWN" && action !== "observe",
  },
  {
    id: "H-06",
    description: "Never act if module has protectionLevel CRITICAL (except observe)",
    check: (action, module) =>
      module?.protectionLevel === ProtectionLevel.CRITICAL && action !== "observe",
  },
  {
    id: "H-07",
    description: "Action rate limit: never fire on a module in cooldown",
    check: (action, module) =>
      action !== "observe" && module?.actionCooldownUntil > Date.now(),
  },
  {
    id: "H-08",
    description: "Never mark neverAutoTouch module for AUTO/APPROVE action",
    check: (action, module, telemetry, tier) =>
      module?.neverAutoTouch === true &&
      action !== "observe" &&
      tier === ActionTier.AUTO,
  },
  {
    id: "H-09",
    description: "Never take action if health gate is closed",
    check: (action, module, telemetry, tier, context) =>
      action !== "observe" &&
      tier === ActionTier.AUTO &&
      context?.healthGateOpen === false,
  },
  {
    id: "H-10",
    description: "Kill switch: disable all AUTO actions when kill switch is active",
    check: (action, module, telemetry, tier, context) =>
      tier === ActionTier.AUTO && context?.killSwitchActive === true && action !== "observe",
  },
];

/**
 * Evaluate all hard safety rules for a proposed action.
 *
 * @param {string} action
 * @param {object} module       Registry entry
 * @param {object} telemetry    Current telemetry snapshot
 * @param {number} tier         ActionTier value
 * @param {object} [context]    Runtime context: { healthGateOpen, killSwitchActive }
 * @returns {{ pass: boolean, violations: string[] }}
 */
export function evaluateHardRules(action, module, telemetry, tier, context = {}) {
  const violations = [];
  for (const rule of HARD_RULES) {
    try {
      if (rule.check(action, module, telemetry, tier, context)) {
        violations.push(`${rule.id}: ${rule.description}`);
      }
    } catch {
      // A rule that throws is treated as a violation (fail-safe)
      violations.push(`${rule.id}: evaluation error (treated as violation)`);
    }
  }
  return { pass: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Layer 2: Policy Rules
// ---------------------------------------------------------------------------

/**
 * Confidence thresholds per action tier.
 */
const CONFIDENCE_THRESHOLD = {
  [ActionTier.AUTO]: 75,
  [ActionTier.RECOMMEND]: 45,
  [ActionTier.APPROVE]: 25,
  [ActionTier.OBSERVE]: 0,
};

/**
 * Policy rule definition.
 * @typedef {{
 *   id: string,
 *   description: string,
 *   appliesTo: string[],        Module types this rule targets
 *   condition: function,        (module, telemetry, nowMs) → boolean
 *   action: string,
 *   tier: number,               ActionTier
 *   buildReason: function,      (module, telemetry) → string
 *   minConfidenceOverride?: number  Optional per-rule override
 * }} PolicyRule
 */

const POLICY_RULES = [
  // -------------------------------------------------------------------
  // Rule 1: Pause idle crawler during active chat session
  // Session-protection rule: always fires when conditions are met.
  // Low minConfidenceOverride because this is a safety rule, not a heuristic.
  // -------------------------------------------------------------------
  {
    id: "PR-01",
    description: "Pause idle crawler during active session",
    appliesTo: [ModuleType.CRAWLER],
    condition: (module, telemetry, nowMs) =>
      telemetry?.sessionMode === "active" &&
      idleScore(module, nowMs) > 30 &&
      module.state !== "suspended",
    action: "pause-crawler",
    tier: ActionTier.AUTO,
    minConfidenceOverride: 0,  // Safety rule — session protection always fires
    buildReason: (module) =>
      `Pausing "${module.displayName}" during active session to free resources for the AI`,
  },

  // -------------------------------------------------------------------
  // Rule 2: Defer brain IR rebuild during active session
  // -------------------------------------------------------------------
  {
    id: "PR-02",
    description: "Defer brain rebuild during active session",
    appliesTo: [ModuleType.BRAIN_IR_BUILDER],
    condition: (module, telemetry) =>
      telemetry?.sessionMode === "active" &&
      module.state === "active",
    action: "defer-rebuild",
    tier: ActionTier.AUTO,
    minConfidenceOverride: 0,  // Safety rule — always defer during active session
    buildReason: () => "Deferring brain rebuild to after the active session ends",
  },

  // -------------------------------------------------------------------
  // Rule 3: Cancel diagnostic jobs under high RAM pressure
  // Pressure-response rule: fires on explicit pressure condition.
  // -------------------------------------------------------------------
  {
    id: "PR-03",
    description: "Cancel diagnostic jobs under high RAM pressure",
    appliesTo: [ModuleType.DIAGNOSTIC_JOB],
    condition: (module, telemetry) =>
      ["high", "critical"].includes(telemetry?.pressure?.ram) &&
      module.state === "active",
    action: "cancel-diagnostic",
    tier: ActionTier.AUTO,
    minConfidenceOverride: 10,  // Pressure rule — low threshold since explicit condition
    buildReason: (module, telemetry) =>
      `Cancelling "${module.displayName}" — RAM pressure is ${telemetry.pressure.ram}`,
  },

  // -------------------------------------------------------------------
  // Rule 4: Recommend disabling stale crawler
  // -------------------------------------------------------------------
  {
    id: "PR-04",
    description: "Recommend disabling persistently stale crawler",
    appliesTo: [ModuleType.CRAWLER],
    condition: (module, telemetry, nowMs) =>
      stalenessScore(module, nowMs) > 80 &&
      interventionConfidence(module, telemetry, "pause-crawler", nowMs) > 55,
    action: "pause-crawler",
    tier: ActionTier.RECOMMEND,
    buildReason: (module) =>
      `"${module.displayName}" has not done meaningful work in a long time. Consider disabling it.`,
  },

  // -------------------------------------------------------------------
  // Rule 5: Recommend cache eviction under moderate/high RAM pressure
  // -------------------------------------------------------------------
  {
    id: "PR-05",
    description: "Recommend cold cache eviction under RAM pressure",
    appliesTo: [ModuleType.BROWSER_CACHE],
    condition: (module, telemetry, nowMs) =>
      ["moderate", "high", "critical"].includes(telemetry?.pressure?.ram) &&
      idleScore(module, nowMs) > 60,
    action: "evict-browser-cache",
    tier: ActionTier.RECOMMEND,
    buildReason: (module, telemetry) =>
      `Browser file cache is idle and RAM pressure is ${telemetry.pressure.ram}. Evicting it will free memory.`,
  },

  // -------------------------------------------------------------------
  // Rule 6: Lower crawler fetch workers under high RAM pressure
  // -------------------------------------------------------------------
  {
    id: "PR-06",
    description: "Lower crawler fetch workers under high RAM pressure",
    appliesTo: [ModuleType.CRAWLER],
    condition: (module, telemetry) =>
      ["high", "critical"].includes(telemetry?.pressure?.ram) &&
      module.state === "active" &&
      (module.metadata?.activeFetchWorkers ?? 0) > 1,
    action: "lower-fetch-workers",
    tier: ActionTier.AUTO,
    buildReason: (module, telemetry) =>
      `Reducing "${module.displayName}" fetch workers — RAM pressure is ${telemetry.pressure.ram}`,
  },

  // -------------------------------------------------------------------
  // Rule 7: Pause all crawlers under critical RAM pressure
  // -------------------------------------------------------------------
  {
    id: "PR-07",
    description: "Pause all crawlers under critical RAM pressure",
    appliesTo: [ModuleType.CRAWLER],
    condition: (module, telemetry) =>
      telemetry?.pressure?.ram === "critical" &&
      module.state !== "suspended",
    action: "pause-crawler",
    tier: ActionTier.AUTO,
    minConfidenceOverride: 65,  // Lower threshold under critical pressure
    buildReason: (module, telemetry) =>
      `Emergency: pausing "${module.displayName}" — RAM pressure is critical`,
  },

  // -------------------------------------------------------------------
  // Rule 8: Recommend stopping stale ingestion worker
  // -------------------------------------------------------------------
  {
    id: "PR-08",
    description: "Recommend stopping stale ingestion worker",
    appliesTo: [ModuleType.INGESTION_WORKER],
    condition: (module, telemetry, nowMs) =>
      stalenessScore(module, nowMs) > 75 &&
      interventionConfidence(module, telemetry, "kill-ingestion-worker", nowMs) > 50,
    action: "kill-ingestion-worker",
    tier: ActionTier.RECOMMEND,
    buildReason: (module) =>
      `"${module.displayName}" appears stale. Check if it is still needed.`,
  },

  // -------------------------------------------------------------------
  // Rule 9: Resume paused crawlers when session ends and pressure is low
  // -------------------------------------------------------------------
  {
    id: "PR-09",
    description: "Resume paused crawlers after session ends",
    appliesTo: [ModuleType.CRAWLER],
    condition: (module, telemetry) =>
      telemetry?.sessionMode === "background" &&
      telemetry?.pressure?.overall === "low" &&
      module.state === "suspended" &&
      module.metadata?.pausedByOptimizer === true,
    action: "resume-crawler",
    tier: ActionTier.AUTO,
    minConfidenceOverride: 30,  // Always resume if conditions are right
    buildReason: () => "Session ended and resources are available — resuming crawler",
  },

  // -------------------------------------------------------------------
  // Rule 10: Record observation for healthy idle modules (OBSERVE tier)
  // -------------------------------------------------------------------
  {
    id: "PR-10",
    description: "Log observation for idle low-priority modules",
    appliesTo: [ModuleType.DIAGNOSTIC_JOB, ModuleType.BROWSER_CACHE],
    condition: (module, telemetry, nowMs) => idleScore(module, nowMs) > 70,
    action: "observe",
    tier: ActionTier.OBSERVE,
    buildReason: (module) =>
      `"${module.displayName}" is idle. Monitoring only.`,
  },
];

// ---------------------------------------------------------------------------
// Policy evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all policy rules against a single module and return action candidates.
 *
 * @param {object} module       Registry entry
 * @param {object} telemetry    Current telemetry snapshot
 * @param {number} [nowMs]
 * @returns {object[]}  Array of action candidates: { ruleId, action, tier, confidence, reason, module }
 */
export function evaluatePolicyForModule(module, telemetry, nowMs = Date.now()) {
  if (!module || module.neverAutoTouch) return [];

  const candidates = [];

  for (const rule of POLICY_RULES) {
    // Check if rule applies to this module type
    if (!rule.appliesTo.includes(module.type)) continue;

    // Evaluate condition
    let conditionMet = false;
    try {
      conditionMet = rule.condition(module, telemetry, nowMs);
    } catch {
      continue;  // Skip rules that throw
    }
    if (!conditionMet) continue;

    // Compute confidence
    const conf = interventionConfidence(module, telemetry, rule.action, nowMs);

    // Check confidence threshold (use rule override if provided)
    const minConf = rule.minConfidenceOverride ?? CONFIDENCE_THRESHOLD[rule.tier] ?? 0;
    if (rule.tier !== ActionTier.OBSERVE && conf < minConf) continue;

    // Build reason string
    let reason = rule.description;
    try {
      reason = rule.buildReason(module, telemetry) || reason;
    } catch {
      // keep default reason
    }

    candidates.push({
      ruleId: rule.id,
      action: rule.action,
      tier: rule.tier,
      tierLabel: tierLabel(rule.tier),
      confidence: conf,
      reason,
      module,
      nowMs,
    });
  }

  return candidates;
}

/**
 * Evaluate all policy rules across all modules.
 * Returns a flat list of candidates sorted by priority (tier, then confidence).
 *
 * @param {object[]} modules    All registry entries
 * @param {object} telemetry    Current telemetry snapshot
 * @param {number} [nowMs]
 * @returns {object[]}
 */
export function evaluatePolicy(modules, telemetry, nowMs = Date.now()) {
  const allCandidates = [];
  for (const module of modules) {
    const candidates = evaluatePolicyForModule(module, telemetry, nowMs);
    allCandidates.push(...candidates);
  }

  // Sort: OBSERVE last, then by tier (lower tier number = higher priority),
  // then by confidence descending
  return allCandidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;  // AUTO before RECOMMEND before APPROVE before OBSERVE
    return b.confidence - a.confidence;
  });
}

/**
 * Gate a single action candidate through hard rules and return pass/fail.
 *
 * @param {object} candidate    Action candidate from evaluatePolicy
 * @param {object} [context]    { healthGateOpen, killSwitchActive, autoActionsThisTick }
 * @returns {{ allowed: boolean, violations: string[], skipReason?: string }}
 */
export function gateAction(candidate, context = {}) {
  const { action, module, telemetry, tier } = candidate;

  // Check auto action budget per tick
  if (tier === ActionTier.AUTO) {
    const budget = context.autoActionsThisTick ?? 0;
    if (budget >= 3) {
      return { allowed: false, violations: [], skipReason: "Auto action budget exhausted for this tick (max 3)" };
    }
  }

  // Check hard rules
  const hardRuleResult = evaluateHardRules(action, module, telemetry, tier, context);
  if (!hardRuleResult.pass) {
    return { allowed: false, violations: hardRuleResult.violations };
  }

  return { allowed: true, violations: [] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierLabel(tier) {
  switch (tier) {
    case ActionTier.OBSERVE: return "OBSERVE";
    case ActionTier.AUTO: return "AUTO";
    case ActionTier.RECOMMEND: return "RECOMMEND";
    case ActionTier.APPROVE: return "APPROVE";
    case ActionTier.NEVER: return "NEVER";
    default: return "UNKNOWN";
  }
}

function extractHardRuleId(value) {
  const text = String(value || "");
  const match = text.match(/^(H-\d+)/);
  return match ? match[1] : null;
}

export function getPolicyDiagnostics(auditEvents = []) {
  const policyStats = new Map();
  const hardRuleStats = new Map();

  for (const event of Array.isArray(auditEvents) ? auditEvents : []) {
    const ruleId = typeof event?.ruleId === "string" ? event.ruleId : null;
    if (ruleId) {
      const current = policyStats.get(ruleId) || { firedCount: 0, lastFiredAt: null, lastTick: null };
      current.firedCount += 1;
      current.lastFiredAt = event.ts || current.lastFiredAt;
      current.lastTick = event.tick ?? current.lastTick;
      policyStats.set(ruleId, current);
    }

    for (const violation of Array.isArray(event?.hardRuleViolations) ? event.hardRuleViolations : []) {
      const hardRuleId = extractHardRuleId(violation);
      if (!hardRuleId) continue;
      const current = hardRuleStats.get(hardRuleId) || { blockCount: 0, lastBlockedAt: null, lastTick: null };
      current.blockCount += 1;
      current.lastBlockedAt = event.ts || current.lastBlockedAt;
      current.lastTick = event.tick ?? current.lastTick;
      hardRuleStats.set(hardRuleId, current);
    }
  }

  return {
    policyRules: POLICY_RULES.map((rule) => {
      const stats = policyStats.get(rule.id) || { firedCount: 0, lastFiredAt: null, lastTick: null };
      return {
        id: rule.id,
        description: rule.description,
        action: rule.action,
        tier: rule.tier,
        tierLabel: tierLabel(rule.tier),
        appliesTo: [...rule.appliesTo],
        minConfidence: rule.minConfidenceOverride ?? CONFIDENCE_THRESHOLD[rule.tier] ?? 0,
        firedCount: stats.firedCount,
        lastFiredAt: stats.lastFiredAt,
        lastTick: stats.lastTick,
      };
    }),
    hardRules: HARD_RULES.map((rule) => {
      const stats = hardRuleStats.get(rule.id) || { blockCount: 0, lastBlockedAt: null, lastTick: null };
      return {
        id: rule.id,
        description: rule.description,
        blockCount: stats.blockCount,
        lastBlockedAt: stats.lastBlockedAt,
        lastTick: stats.lastTick,
      };
    }),
  };
}

export { POLICY_RULES, HARD_RULES, CONFIDENCE_THRESHOLD };
