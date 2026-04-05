/**
 * Optimizer Action Executor
 *
 * Executes safe optimizer actions. Every action:
 * 1. Re-checks hard safety rules
 * 2. Captures pre-action state snapshot
 * 3. Executes the action
 * 4. Updates module registry
 * 5. Records to audit log
 * 6. Returns a result object for the supervisor to schedule health checks
 *
 * Actions are intentionally limited to low-risk, reversible operations.
 * Higher-risk actions (kill-ingestion-worker, unload-model) are supported
 * only as RECOMMEND/APPROVE targets and must be confirmed by the user.
 */

import {
  setModuleCooldown,
  updateModuleState,
  noteModuleActivity,
  ModuleState,
  getModule,
} from "./optimizer-registry.mjs";
import { writeAuditEvent } from "./optimizer-audit.mjs";
import { riskScore } from "./optimizer-scoring.mjs";
import { evaluateHardRules } from "./optimizer-policy.mjs";
import { setIdleTrainingEnabled } from "./brain-idle-training.mjs";
import {
  updateCrawlerSettings,
} from "./brain-runtime-settings.mjs";

// ---------------------------------------------------------------------------
// Action result codes
// ---------------------------------------------------------------------------

export const ActionResult = Object.freeze({
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
  BLOCKED: "blocked",
});

// Default cooldown after each action (ms)
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;  // 5 minutes

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function captureModuleSnapshot(module) {
  if (!module) return null;
  return {
    id: module.id,
    state: module.state,
    lastActiveAt: module.lastActiveAt,
    resourceHints: { ...module.resourceHints },
    metadata: { ...module.metadata },
  };
}

function buildAuditBase(candidate, preState, sessionMode, pressure, telemetry) {
  return {
    type: "action",
    ruleId: candidate.ruleId ?? null,
    moduleId: candidate.module?.id ?? null,
    moduleDisplayName: candidate.module?.displayName ?? null,
    action: candidate.action,
    tier: candidate.tier,
    tierLabel: candidate.tierLabel,
    confidence: candidate.confidence,
    riskScore: riskScore(candidate.action, candidate.module, telemetry),
    reason: candidate.reason,
    sessionMode,
    pressure,
    preState,
  };
}

// ---------------------------------------------------------------------------
// Individual action implementations
// ---------------------------------------------------------------------------

/**
 * Pause a crawler (set idle training disabled for this crawler ID).
 */
async function doPauseCrawler(module, opts = {}) {
  const crawlerId = module.id;
  try {
    setIdleTrainingEnabled(false, crawlerId);
    updateModuleState(crawlerId, ModuleState.SUSPENDED, {
      pausedByOptimizer: true,
      pausedAt: Date.now(),
    });
    return { result: ActionResult.SUCCESS };
  } catch (err) {
    return { result: ActionResult.FAILED, error: String(err?.message || err) };
  }
}

/**
 * Resume a previously paused crawler.
 */
async function doResumeCrawler(module, opts = {}) {
  const crawlerId = module.id;
  try {
    setIdleTrainingEnabled(true, crawlerId);
    updateModuleState(crawlerId, ModuleState.ACTIVE, {
      pausedByOptimizer: false,
      resumedAt: Date.now(),
    });
    noteModuleActivity(crawlerId, false);
    return { result: ActionResult.SUCCESS };
  } catch (err) {
    return { result: ActionResult.FAILED, error: String(err?.message || err) };
  }
}

/**
 * Lower the number of parallel fetch workers for a crawler.
 */
async function doLowerFetchWorkers(module, opts = {}) {
  const crawlerId = module.id;
  const targetWorkers = opts.targetWorkers ?? 1;
  try {
    updateCrawlerSettings(crawlerId, {
      learning: { parallelFetchWorkers: targetWorkers },
    });
    return { result: ActionResult.SUCCESS };
  } catch (err) {
    return { result: ActionResult.FAILED, error: String(err?.message || err) };
  }
}

/**
 * Defer a pending brain IR rebuild (set a flag checked by the control loop).
 * The actual rebuild deferral is managed via a shared flag in optimizer-control-loop.
 */
async function doDeferRebuild(module, opts = {}) {
  // Signal to the control loop that rebuilds should wait
  if (opts.setDeferRebuild) {
    opts.setDeferRebuild(true);
  }
  return { result: ActionResult.SUCCESS };
}

/**
 * Cancel an active diagnostic job (mark as unloaded in registry).
 */
async function doCancelDiagnostic(module) {
  try {
    updateModuleState(module.id, ModuleState.UNLOADED, {
      cancelledByOptimizer: true,
      cancelledAt: Date.now(),
    });
    return { result: ActionResult.SUCCESS };
  } catch (err) {
    return { result: ActionResult.FAILED, error: String(err?.message || err) };
  }
}

/**
 * Evict browser cache (mark as unloaded — actual cache clearing handled elsewhere).
 */
async function doEvictBrowserCache(module) {
  try {
    updateModuleState(module.id, ModuleState.UNLOADED, {
      evictedByOptimizer: true,
      evictedAt: Date.now(),
    });
    return { result: ActionResult.SUCCESS };
  } catch (err) {
    return { result: ActionResult.FAILED, error: String(err?.message || err) };
  }
}

/**
 * Record an observation (OBSERVE tier — no action taken, log only).
 */
async function doObserve(module, opts = {}) {
  return { result: ActionResult.SUCCESS, observationOnly: true };
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

const ACTION_HANDLERS = {
  "pause-crawler": doPauseCrawler,
  "resume-crawler": doResumeCrawler,
  "lower-fetch-workers": doLowerFetchWorkers,
  "defer-rebuild": doDeferRebuild,
  "cancel-diagnostic": doCancelDiagnostic,
  "evict-browser-cache": doEvictBrowserCache,
  "review-hotspot": doObserve,
  "observe": doObserve,
};

// ---------------------------------------------------------------------------
// Main execution function
// ---------------------------------------------------------------------------

/**
 * Execute an approved action candidate.
 *
 * @param {object} candidate      From evaluatePolicy
 * @param {object} telemetry      Current telemetry snapshot
 * @param {object} [opts]
 * @param {object} [opts.context]  { healthGateOpen, killSwitchActive, autoActionsThisTick }
 * @param {function} [opts.setDeferRebuild]  Setter for defer-rebuild flag
 * @returns {Promise<object>}     { result, preState, postState, healthCheckDelayMs, auditEntry }
 */
export async function executeAction(candidate, telemetry, opts = {}) {
  const { action, module: moduleRef, tier } = candidate;
  const context = opts.context ?? {};
  const sessionMode = telemetry?.sessionMode ?? "unknown";
  const pressure = telemetry?.pressure?.overall ?? "unknown";

  // Re-fetch the module to get the latest state
  const module = getModule(moduleRef?.id) ?? moduleRef;

  // Pre-action state snapshot
  const preState = captureModuleSnapshot(module);

  // Build base audit data
  const auditBase = buildAuditBase(candidate, preState, sessionMode, pressure, telemetry);

  // Hard rule re-check (defense in depth — policy already checked, but verify again)
  const hardCheck = evaluateHardRules(action, module, telemetry, tier, context);
  if (!hardCheck.pass) {
    const auditEntry = writeAuditEvent({
      ...auditBase,
      result: ActionResult.BLOCKED,
      hardRuleViolations: hardCheck.violations,
      type: "violation",
    });
    return {
      result: ActionResult.BLOCKED,
      preState,
      postState: null,
      hardRuleViolations: hardCheck.violations,
      auditEntry,
    };
  }

  // Dispatch to handler
  const handler = ACTION_HANDLERS[action];
  if (!handler) {
    const auditEntry = writeAuditEvent({
      ...auditBase,
      result: ActionResult.FAILED,
      postState: null,
      meta: { reason: `No handler for action "${action}"` },
    });
    return { result: ActionResult.FAILED, preState, postState: null, auditEntry };
  }

  let execResult;
  try {
    execResult = await handler(module, { ...opts, telemetry });
  } catch (err) {
    const auditEntry = writeAuditEvent({
      ...auditBase,
      result: ActionResult.FAILED,
      postState: null,
      meta: { error: String(err?.message || err) },
    });
    return { result: ActionResult.FAILED, preState, postState: null, auditEntry };
  }

  // Apply cooldown after successful action (skip for observe)
  if (action !== "observe" && execResult.result === ActionResult.SUCCESS) {
    setModuleCooldown(module.id, DEFAULT_COOLDOWN_MS);
  }

  // Post-action state snapshot
  const postState = captureModuleSnapshot(getModule(module.id) ?? module);

  // Write audit entry
  const healthCheckDelayMs = action === "observe" ? null : 60_000;  // 60s health check
  const auditEntry = writeAuditEvent({
    ...auditBase,
    result: execResult.result,
    postState,
    rollbackTriggered: false,
    healthCheckScheduledAt: healthCheckDelayMs
      ? new Date(Date.now() + healthCheckDelayMs).toISOString()
      : null,
    meta: execResult.observationOnly ? { observationOnly: true } : null,
  });

  return {
    result: execResult.result,
    preState,
    postState,
    healthCheckDelayMs,
    auditEntry,
    error: execResult.error ?? null,
  };
}

// ---------------------------------------------------------------------------
// Recommendation queue
// ---------------------------------------------------------------------------

/** @type {object[]} Active recommendation queue */
const recommendationQueue = [];
let nextRecommendationId = 1;

/** @type {object[]} Active approval queue */
const pendingApprovalQueue = [];
let nextPendingApprovalId = 1;

/**
 * Add a RECOMMEND-tier candidate to the queue for the user to see.
 * Deduplicates by moduleId + action.
 */
export function addRecommendation(candidate, telemetry) {
  const key = `${candidate.module?.id}::${candidate.action}`;
  const existing = recommendationQueue.findIndex(
    (r) => `${r.moduleId}::${r.action}` === key
  );
  if (existing >= 0) {
    // Update the existing entry with latest confidence
    const nextEntry = buildRecommendationEntry(candidate, telemetry);
    recommendationQueue[existing] = {
      ...recommendationQueue[existing],
      ...nextEntry,
      id: recommendationQueue[existing].id,
      createdAt: recommendationQueue[existing].createdAt,
    };
    return recommendationQueue[existing];
  }

  const entry = buildRecommendationEntry(candidate, telemetry);
  recommendationQueue.push(entry);

  writeAuditEvent({
    type: "recommendation",
    ruleId: candidate.ruleId ?? null,
    moduleId: candidate.module?.id,
    moduleDisplayName: candidate.module?.displayName ?? null,
    action: candidate.action,
    tier: candidate.tier,
    tierLabel: candidate.tierLabel,
    confidence: candidate.confidence,
    reason: candidate.reason,
    sessionMode: telemetry?.sessionMode,
    pressure: telemetry?.pressure?.overall,
    result: "pending",
  });

  return entry;
}

function buildRecommendationEntry(candidate, telemetry) {
  return {
    id: nextRecommendationId++,
    ruleId: candidate.ruleId,
    moduleId: candidate.module?.id,
    moduleDisplayName: candidate.module?.displayName,
    action: candidate.action,
    tier: candidate.tier,
    tierLabel: candidate.tierLabel,
    confidence: Math.round(candidate.confidence),
    reason: candidate.reason,
    createdAt: new Date().toISOString(),
    status: "pending",   // pending | accepted | ignored | snoozed | expired
    snoozedUntil: null,
  };
}

/** Return the current recommendation queue. */
export function getRecommendations() {
  const now = Date.now();
  // Filter out snoozed items that haven't expired
  return recommendationQueue.filter((r) => {
    if (r.status === "accepted" || r.status === "ignored") return false;
    if (r.status === "snoozed" && r.snoozedUntil && new Date(r.snoozedUntil).getTime() > now) return false;
    return true;
  });
}

/** Accept and execute a recommendation by ID. */
export async function acceptRecommendation(id, telemetry, opts = {}) {
  const rec = recommendationQueue.find((r) => r.id === id);
  if (!rec) return null;

  rec.status = "accepted";

  const module = getModule(rec.moduleId);
  if (!module) {
    writeAuditEvent({
      type: "recommendation",
      ruleId: rec.ruleId ?? null,
      moduleId: rec.moduleId,
      moduleDisplayName: rec.moduleDisplayName ?? null,
      action: rec.action,
      tier: rec.tier,
      tierLabel: rec.tierLabel,
      confidence: rec.confidence,
      reason: rec.reason,
      sessionMode: telemetry?.sessionMode,
      pressure: telemetry?.pressure?.overall,
      result: ActionResult.FAILED,
      meta: { error: "Module is no longer registered." },
    });
    return {
      recommendation: rec,
      execution: null,
      error: "Module is no longer registered.",
    };
  }

  const execution = await executeAction(
    {
      ruleId: rec.ruleId ?? null,
      action: rec.action,
      tier: rec.tier,
      tierLabel: rec.tierLabel,
      confidence: rec.confidence,
      reason: rec.reason,
      module,
    },
    telemetry,
    opts
  );

  writeAuditEvent({
    type: "recommendation",
    ruleId: rec.ruleId ?? null,
    moduleId: rec.moduleId,
    moduleDisplayName: rec.moduleDisplayName ?? null,
    action: rec.action,
    tier: rec.tier,
    tierLabel: rec.tierLabel,
    confidence: rec.confidence,
    reason: `Accepted recommendation: ${rec.reason}`,
    sessionMode: telemetry?.sessionMode,
    pressure: telemetry?.pressure?.overall,
    result: execution?.result ?? ActionResult.SKIPPED,
  });

  return {
    recommendation: rec,
    execution,
    error: execution?.error ?? null,
  };
}

/** Ignore a recommendation by ID. */
export function ignoreRecommendation(id) {
  const rec = recommendationQueue.find((r) => r.id === id);
  if (rec) {
    rec.status = "ignored";
    writeAuditEvent({
      type: "recommendation",
      ruleId: rec.ruleId ?? null,
      moduleId: rec.moduleId,
      moduleDisplayName: rec.moduleDisplayName ?? null,
      action: rec.action,
      tier: rec.tier,
      tierLabel: rec.tierLabel,
      confidence: rec.confidence,
      reason: `Ignored recommendation: ${rec.reason}`,
      result: ActionResult.SKIPPED,
    });
  }
  return rec ?? null;
}

/** Snooze a recommendation by ID for the given duration in ms. */
export function snoozeRecommendation(id, durationMs = 60 * 60 * 1000) {
  const rec = recommendationQueue.find((r) => r.id === id);
  if (rec) {
    rec.status = "snoozed";
    rec.snoozedUntil = new Date(Date.now() + durationMs).toISOString();
    writeAuditEvent({
      type: "recommendation",
      ruleId: rec.ruleId ?? null,
      moduleId: rec.moduleId,
      moduleDisplayName: rec.moduleDisplayName ?? null,
      action: rec.action,
      tier: rec.tier,
      tierLabel: rec.tierLabel,
      confidence: rec.confidence,
      reason: `Snoozed recommendation for ${Math.round(durationMs / 60000)} minutes: ${rec.reason}`,
      result: ActionResult.SKIPPED,
    });
  }
  return rec ?? null;
}

function buildPendingApprovalEntry(candidate, telemetry) {
  const module = candidate.module ?? null;
  return {
    id: nextPendingApprovalId++,
    ruleId: candidate.ruleId ?? null,
    moduleId: module?.id ?? null,
    moduleDisplayName: module?.displayName ?? null,
    action: candidate.action,
    tier: candidate.tier,
    tierLabel: candidate.tierLabel,
    confidence: Math.round(candidate.confidence),
    riskScore: riskScore(candidate.action, module, telemetry),
    reason: candidate.reason,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
}

export function addPendingApproval(candidate, telemetry) {
  const key = `${candidate.module?.id}::${candidate.action}`;
  const existingIndex = pendingApprovalQueue.findIndex(
    (entry) => `${entry.moduleId}::${entry.action}` === key && entry.status === "pending"
  );

  const nextEntry = buildPendingApprovalEntry(candidate, telemetry);
  if (existingIndex >= 0) {
    pendingApprovalQueue[existingIndex] = {
      ...pendingApprovalQueue[existingIndex],
      ...nextEntry,
      id: pendingApprovalQueue[existingIndex].id,
      createdAt: pendingApprovalQueue[existingIndex].createdAt,
    };
    return pendingApprovalQueue[existingIndex];
  }

  pendingApprovalQueue.push(nextEntry);
  writeAuditEvent({
    type: "approval",
    ruleId: candidate.ruleId ?? null,
    moduleId: candidate.module?.id,
    moduleDisplayName: candidate.module?.displayName ?? null,
    action: candidate.action,
    tier: candidate.tier,
    tierLabel: candidate.tierLabel,
    confidence: candidate.confidence,
    reason: candidate.reason,
    sessionMode: telemetry?.sessionMode,
    pressure: telemetry?.pressure?.overall,
    result: "pending",
  });
  return nextEntry;
}

export function getPendingApprovals() {
  return pendingApprovalQueue.filter((entry) => entry.status === "pending");
}

export async function approvePendingAction(id, telemetry, opts = {}) {
  const approval = pendingApprovalQueue.find((entry) => entry.id === id);
  if (!approval) return null;

  approval.status = "approved";
  const module = getModule(approval.moduleId);
  if (!module) {
    writeAuditEvent({
      type: "approval",
      ruleId: approval.ruleId ?? null,
      moduleId: approval.moduleId,
      moduleDisplayName: approval.moduleDisplayName ?? null,
      action: approval.action,
      tier: approval.tier,
      tierLabel: approval.tierLabel,
      confidence: approval.confidence,
      reason: `Approved action could not run because the module is no longer registered: ${approval.reason}`,
      sessionMode: telemetry?.sessionMode,
      pressure: telemetry?.pressure?.overall,
      result: ActionResult.FAILED,
    });
    return {
      approval,
      execution: null,
      error: "Module is no longer registered.",
    };
  }

  const execution = await executeAction(
    {
      ruleId: approval.ruleId ?? null,
      action: approval.action,
      tier: approval.tier,
      tierLabel: approval.tierLabel,
      confidence: approval.confidence,
      reason: approval.reason,
      module,
    },
    telemetry,
    opts
  );

  writeAuditEvent({
    type: "approval",
    ruleId: approval.ruleId ?? null,
    moduleId: approval.moduleId,
    moduleDisplayName: approval.moduleDisplayName ?? null,
    action: approval.action,
    tier: approval.tier,
    tierLabel: approval.tierLabel,
    confidence: approval.confidence,
    reason: `Approved action executed: ${approval.reason}`,
    sessionMode: telemetry?.sessionMode,
    pressure: telemetry?.pressure?.overall,
    result: execution?.result ?? ActionResult.SKIPPED,
  });

  return {
    approval,
    execution,
    error: execution?.error ?? null,
  };
}

export function declinePendingAction(id) {
  const approval = pendingApprovalQueue.find((entry) => entry.id === id);
  if (approval) {
    approval.status = "declined";
    writeAuditEvent({
      type: "approval",
      ruleId: approval.ruleId ?? null,
      moduleId: approval.moduleId,
      moduleDisplayName: approval.moduleDisplayName ?? null,
      action: approval.action,
      tier: approval.tier,
      tierLabel: approval.tierLabel,
      confidence: approval.confidence,
      reason: `Declined approval: ${approval.reason}`,
      result: ActionResult.SKIPPED,
    });
  }
  return approval ?? null;
}

/** Clear queued recommendations (for tests). */
export function resetRecommendations() {
  recommendationQueue.length = 0;
  nextRecommendationId = 1;
  pendingApprovalQueue.length = 0;
  nextPendingApprovalId = 1;
}
