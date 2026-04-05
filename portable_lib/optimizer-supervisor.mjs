/**
 * Optimizer Rollback / Health Supervisor
 *
 * After each AUTO action, the supervisor schedules a health check.
 * If the health check detects degradation, it triggers a rollback.
 *
 * Safety model:
 * - healthGateOpen starts as true (open = actions allowed)
 * - A failed health check closes the gate (no new AUTO actions)
 * - Gate reopens only when a subsequent health check passes
 * - After 3 rollbacks of the same action type within 1 hour: disable that action type
 * - After 2 consecutive failed health checks: disable ALL AUTO actions (kill-switch-like)
 */

import { ActionTier } from "./optimizer-registry.mjs";
import { writeAuditEvent } from "./optimizer-audit.mjs";
import { setIdleTrainingEnabled } from "./brain-idle-training.mjs";
import { updateModuleState, ModuleState } from "./optimizer-registry.mjs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Whether new AUTO actions are permitted. */
let healthGateOpen = true;

/** Count of consecutive failed health checks. */
let consecutiveFailedHealthChecks = 0;

/** Count of rollbacks per action type within the rolling window. */
const rollbackCounts = new Map();  // actionType → { count, windowStartMs }

/** Action types that have been disabled due to too many rollbacks. */
const disabledActionTypes = new Set();

/** Scheduled health check timers. */
const pendingHealthChecks = new Map();  // checkId → timeoutId

let nextCheckId = 1;

// Rollback budget
const MAX_ROLLBACKS_PER_ACTION_PER_HOUR = 3;
const MAX_CONSECUTIVE_FAILED_CHECKS = 2;
const ROLLBACK_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const DEFAULT_HEALTH_CHECK_DELAY_MS = 60_000;  // 60 seconds

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Run a synchronous health check after an action.
 *
 * @param {object} preState    Module state before action
 * @param {object} postState   Module state after action (may be null if module unloaded)
 * @param {object} telemetryNow  Current telemetry snapshot (post-action)
 * @param {object} telemetryPre  Pre-action telemetry snapshot
 * @param {string} action
 * @returns {{ pass: boolean, score: number, reasons: string[] }}
 */
export function runHealthCheck(preState, postState, telemetryNow, telemetryPre, action) {
  const reasons = [];
  let score = 100;

  // Check 1: Overall pressure must not have increased by 2+ tiers
  const PRESSURE_RANK = { low: 0, moderate: 1, high: 2, critical: 3 };
  const preRank = PRESSURE_RANK[telemetryPre?.pressure?.overall ?? "low"] ?? 0;
  const postRank = PRESSURE_RANK[telemetryNow?.pressure?.overall ?? "low"] ?? 0;
  if (postRank > preRank + 1) {
    score -= 40;
    reasons.push(`Pressure worsened from ${telemetryPre?.pressure?.overall} to ${telemetryNow?.pressure?.overall}`);
  }

  // Check 2: Registry failed module count should not have increased
  const preFailedCount = telemetryPre?.registry?.failedModules ?? 0;
  const postFailedCount = telemetryNow?.registry?.failedModules ?? 0;
  if (postFailedCount > preFailedCount) {
    score -= 30;
    reasons.push(`Failed module count increased: ${preFailedCount} → ${postFailedCount}`);
  }

  // Check 3: If action was pause-crawler, verify crawler is now suspended (not error)
  if (action === "pause-crawler" && postState) {
    if (postState.state === ModuleState.FAILED || postState.state === ModuleState.QUARANTINED) {
      score -= 25;
      reasons.push(`Crawler entered failed state after pause action`);
    }
  }

  // Check 4: Session mode should not have unexpectedly switched to "active"
  // (which would indicate a race condition where action fired during a user request)
  if (telemetryNow?.sessionMode === "active" && telemetryPre?.sessionMode !== "active") {
    // This is not a health failure, just a note — user started a session post-action
    reasons.push("Note: session became active after action (expected if user started chat)");
  }

  return {
    pass: score >= 60,
    score,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Schedule / execute health checks
// ---------------------------------------------------------------------------

/**
 * Schedule a health check to run after delayMs.
 * The check is asynchronous — the control loop provides telemetry collection.
 *
 * @param {string} action
 * @param {object} preState
 * @param {object} preActionTelemetry
 * @param {number} [delayMs]
 * @param {function} getTelemetry  Function that returns current telemetry
 * @param {function} [onRollback]  Called if rollback is triggered
 * @returns {string} checkId
 */
export function scheduleHealthCheck(action, preState, preActionTelemetry, getTelemetry, onRollback, delayMs = DEFAULT_HEALTH_CHECK_DELAY_MS) {
  const checkId = `hc-${nextCheckId++}`;

  const timerId = setTimeout(async () => {
    pendingHealthChecks.delete(checkId);

    let telemetryNow;
    try {
      telemetryNow = getTelemetry();
    } catch {
      telemetryNow = null;
    }

    const postState = null;  // module state available via registry if needed
    const checkResult = runHealthCheck(preState, postState, telemetryNow, preActionTelemetry, action);

    writeAuditEvent({
      type: "health-check",
      action,
      moduleId: preState?.id,
      result: checkResult.pass ? "success" : "failed",
      preState,
      postState,
      meta: {
        score: checkResult.score,
        reasons: checkResult.reasons,
      },
      sessionMode: telemetryNow?.sessionMode,
      pressure: telemetryNow?.pressure?.overall,
    });

    if (checkResult.pass) {
      consecutiveFailedHealthChecks = 0;
      // Re-open health gate if it was closed by a previous failure
      if (!healthGateOpen) {
        healthGateOpen = true;
        writeAuditEvent({
          type: "observation",
          action: "health-gate-reopened",
          reason: "Health check passed — AUTO actions re-enabled",
          result: "success",
        });
      }
    } else {
      consecutiveFailedHealthChecks += 1;
      healthGateOpen = false;

      // Trigger rollback
      if (onRollback) {
        try {
          await onRollback(action, preState, checkResult.reasons.join(" | "));
        } catch {
          // Rollback failure is non-fatal for the supervisor
        }
      }

      // Check if too many consecutive failures → escalate
      if (consecutiveFailedHealthChecks >= MAX_CONSECUTIVE_FAILED_CHECKS) {
        writeAuditEvent({
          type: "violation",
          action: "auto-tier-disabled",
          reason: `${consecutiveFailedHealthChecks} consecutive failed health checks — all AUTO actions suspended`,
          result: "success",
        });
      }
    }
  }, delayMs);

  pendingHealthChecks.set(checkId, timerId);
  return checkId;
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

/**
 * Perform a rollback of an action.
 * Currently supports: pause-crawler → resume-crawler.
 *
 * @param {string} action    The action to roll back
 * @param {object} preState  Pre-action module state
 * @param {string} reason    Why we're rolling back
 */
export async function triggerRollback(action, preState, reason) {
  writeAuditEvent({
    type: "rollback",
    action: `rollback:${action}`,
    moduleId: preState?.id,
    reason,
    result: "success",
    rollbackTriggered: true,
  });

  // Increment rollback counter for this action type
  const now = Date.now();
  const entry = rollbackCounts.get(action) || { count: 0, windowStartMs: now };
  if (now - entry.windowStartMs > ROLLBACK_WINDOW_MS) {
    // Reset window
    entry.count = 0;
    entry.windowStartMs = now;
  }
  entry.count += 1;
  rollbackCounts.set(action, entry);

  // Disable action type if too many rollbacks
  if (entry.count >= MAX_ROLLBACKS_PER_ACTION_PER_HOUR) {
    disabledActionTypes.add(action);
    writeAuditEvent({
      type: "violation",
      action,
      reason: `Action type "${action}" disabled — ${entry.count} rollbacks within 1 hour`,
      result: "success",
    });
  }

  // Perform the actual rollback
  try {
    if (action === "pause-crawler" && preState?.id) {
      // Re-enable the crawler
      setIdleTrainingEnabled(true, preState.id);
      updateModuleState(preState.id, preState.state || ModuleState.ACTIVE, {
        rolledBack: true,
        rollbackAt: Date.now(),
      });
    }
    // Additional rollback cases added here as actions expand
  } catch (err) {
    writeAuditEvent({
      type: "rollback",
      action: `rollback-failed:${action}`,
      moduleId: preState?.id,
      reason: `Rollback execution failed: ${err?.message || err}`,
      result: "failed",
    });
  }
}

// ---------------------------------------------------------------------------
// State accessors
// ---------------------------------------------------------------------------

/** Whether new AUTO actions should be permitted. */
export function isHealthGateOpen() {
  if (consecutiveFailedHealthChecks >= MAX_CONSECUTIVE_FAILED_CHECKS) return false;
  return healthGateOpen;
}

/** Check if an action type has been disabled due to too many rollbacks. */
export function isActionTypeDisabled(actionType) {
  return disabledActionTypes.has(actionType);
}

/** Return the full supervisor state for telemetry/UI. */
export function getSupervisorState() {
  return {
    healthGateOpen: isHealthGateOpen(),
    consecutiveFailedHealthChecks,
    rollbackCounts: Object.fromEntries(rollbackCounts),
    disabledActionTypes: [...disabledActionTypes],
    pendingHealthCheckCount: pendingHealthChecks.size,
  };
}

/** Clear all state (for testing). */
export function resetSupervisor() {
  healthGateOpen = true;
  consecutiveFailedHealthChecks = 0;
  rollbackCounts.clear();
  disabledActionTypes.clear();
  for (const timerId of pendingHealthChecks.values()) {
    clearTimeout(timerId);
  }
  pendingHealthChecks.clear();
}
