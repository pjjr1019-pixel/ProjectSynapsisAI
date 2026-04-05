/**
 * Optimizer Control Loop
 *
 * The central coordinator for the AI Task Manager & Optimization Layer.
 * Runs on an adaptive interval (5–60 seconds) depending on resource pressure.
 *
 * Each tick:
 * 1. Collect telemetry snapshot
 * 2. Update module registry from live data (crawlers)
 * 3. Evaluate policy for all modules
 * 4. Gate candidates through hard rules + health gate + kill switch
 * 5. Execute AUTO-tier actions (max 3 per tick)
 * 6. Queue RECOMMEND-tier candidates for the UI
 * 7. Log OBSERVE-tier candidates
 * 8. Schedule health checks for executed actions
 * 9. Adapt tick interval to pressure level
 *
 * Start by calling startOptimizerControlLoop() once from server/index.mjs.
 * The loop is non-blocking — each tick is async but errors do not crash the server.
 */

import os from "node:os";
import {
  initializeRegistry,
  updateModuleState,
  noteModuleActivity,
  ModuleState,
  ActionTier,
  getAllModules,
} from "./optimizer-registry.mjs";
import { collectTelemetry, getLatestTelemetry } from "./optimizer-telemetry.mjs";
import { evaluatePolicy, gateAction } from "./optimizer-policy.mjs";
import {
  executeAction,
  addRecommendation,
  getRecommendations,
  addPendingApproval,
  getPendingApprovals,
} from "./optimizer-actions.mjs";
import { detectHotspots, summarizeHotspot, hotspotPriority, explainOptimizerHealth, createTaskQueue } from "../brain/scripts/ai-toolkit/index.mjs";
import {
  scheduleHealthCheck,
  triggerRollback,
  isHealthGateOpen,
  isActionTypeDisabled,
  getSupervisorState,
} from "./optimizer-supervisor.mjs";
import { writeAuditEvent, incrementAuditTick, getAuditSummary } from "./optimizer-audit.mjs";
import { getCrawlerIds, readRuntimeSettings } from "./brain-runtime-settings.mjs";
import { getIdleTrainingSystemSnapshot } from "./brain-idle-training.mjs";
import {
  readOptimizerSettings,
  setOptimizerKillSwitch,
  setOptimizerPerformanceMode as persistOptimizerPerformanceMode,
} from "./optimizer-settings.mjs";
import { checkAndNotify } from "./proactive-notifications.mjs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const INTERVAL_MS = {
  low: 60_000,       // 60s when no pressure
  moderate: 15_000,  // 15s under moderate pressure
  high: 5_000,       // 5s under high pressure
  critical: 5_000,   // 5s under critical pressure
  active: 30_000,    // 30s during active session (mostly skip tick logic)
};

const MAX_AUTO_ACTIONS_PER_TICK = 3;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let loopTimerId = null;
let isRunning = false;
let tickCount = 0;
let killSwitchActive = false;
let deferRebuildActive = false;
let logger = console;

// Kill switch state persists in memory (loaded from settings on startup)
let currentIntervalMs = INTERVAL_MS.low;
let performanceMode = "balanced";

// ---------------------------------------------------------------------------
// Startup / shutdown
// ---------------------------------------------------------------------------

/**
 * Start the optimizer control loop.
 * Safe to call multiple times — subsequent calls are no-ops if already running.
 *
 * @param {object} [opts]
 * @param {object} [opts.logger]          Logger interface ({ log, warn, error })
 * @param {string[]} [opts.crawlerIds]    List of crawler IDs to register
 */
export function startOptimizerControlLoop(opts = {}) {
  if (isRunning) return;
  isRunning = true;
  logger = opts.logger ?? console;

  // Initialize module registry with known modules
  const runtimeSettings = safeReadRuntimeSettings();
  const optimizerSettings = safeReadOptimizerSettings();
  const crawlerIds = extractCrawlerIds(runtimeSettings);
  initializeRegistry({ crawlerIds, optimizerSettings });

  // Load kill switch state from settings
  killSwitchActive = optimizerSettings?.killSwitchActive === true;
  performanceMode = optimizerSettings?.performanceMode || "balanced";

  logger.log("[optimizer] Control loop starting — crawlers:", crawlerIds.join(", "));
  writeAuditEvent({
    type: "observation",
    action: "control-loop-start",
    reason: "Optimizer control loop initialized",
    result: "success",
    meta: { crawlerIds, killSwitchActive, performanceMode },
  });

  scheduleTick();
}

/**
 * Stop the optimizer control loop cleanly.
 */
export function stopOptimizerControlLoop() {
  isRunning = false;
  if (loopTimerId) {
    clearTimeout(loopTimerId);
    loopTimerId = null;
  }
  writeAuditEvent({
    type: "observation",
    action: "control-loop-stop",
    reason: "Optimizer control loop stopped",
    result: "success",
  });
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

function scheduleTick() {
  if (!isRunning) return;
  loopTimerId = setTimeout(async () => {
    try {
      await runTick();
    } catch (err) {
      // Tick errors are non-fatal — log and continue
      logger.error("[optimizer] Tick error:", err?.message || err);
      writeAuditEvent({
        type: "violation",
        action: "tick-error",
        reason: String(err?.message || err),
        result: "failed",
      });
    }
    scheduleTick();
  }, currentIntervalMs);
}

async function runTick() {
  const tickStart = Date.now();
  tickCount += 1;
  incrementAuditTick();

  // Step 1: Collect telemetry
  const telemetry = collectTelemetry();
  const sessionMode = telemetry.sessionMode;
  const pressure = telemetry.pressure?.overall ?? "low";

  // Proactive notifications: fire when pressure escalates.
  checkAndNotify({
    pressure,
    hotspotCount: 0, // updated after hotspot detection below
    cpuPercent: telemetry.cpu?.usagePercent,
    memPercent: telemetry.memory?.usedPercent,
  });

  // Step 2: Sync registry from live crawler data
  syncRegistryFromCrawlers(telemetry);

  // Step 2b: Detect and queue resource hotspots before policy actions
  const modules = getAllModules();
  const hotspotDetection = detectHotspots(telemetry, modules);
  const hotspotQueue = createTaskQueue(
    hotspotDetection.hotspots.map((hotspot) => ({
      id: `hotspot:${hotspot.moduleId}:${hotspot.resource}`,
      type: "hotspot",
      payload: hotspot,
      priority: hotspotPriority(hotspot),
    }))
  );

  while (hotspotQueue.size() > 0) {
    const item = hotspotQueue.dequeue();
    if (!item?.payload) continue;
    addRecommendation(
      {
        ruleId: "HOTSPOT",
        action: "review-hotspot",
        tier: ActionTier.RECOMMEND,
        tierLabel: "recommend",
        confidence: item.priority,
        reason: summarizeHotspot(item.payload),
        module: {
          id: item.payload.moduleId,
          displayName: item.payload.name,
        },
      },
      telemetry
    );
  }

  const healthSummary = explainOptimizerHealth(telemetry, hotspotDetection.hotspots);
  writeAuditEvent({
    type: "observation",
    action: "health-summary",
    reason: healthSummary.headline,
    result: "skipped",
    meta: {
      severity: healthSummary.severity,
      hotspotCount: healthSummary.details.hotspotCount,
      anomalyCount: healthSummary.details.anomalyCount,
    },
  });

  // Step 3: Adapt interval
  currentIntervalMs = selectIntervalForMode(sessionMode, pressure);

  // Step 4: Evaluate policy
  const candidates = evaluatePolicy(modules, telemetry);

  // Step 5: Process candidates
  const context = {
    healthGateOpen: isHealthGateOpen(),
    killSwitchActive,
    autoActionsThisTick: 0,
  };

  for (const candidate of candidates) {
    // Skip disabled action types
    if (isActionTypeDisabled(candidate.action)) continue;

    if (candidate.tier === ActionTier.AUTO) {
      if (context.autoActionsThisTick >= MAX_AUTO_ACTIONS_PER_TICK) continue;

      const gate = gateAction(candidate, context);
      if (!gate.allowed) {
        if (gate.violations?.length > 0) {
          writeAuditEvent({
            type: "violation",
            action: candidate.action,
            moduleId: candidate.module?.id,
            reason: gate.violations.join("; "),
            result: "blocked",
            hardRuleViolations: gate.violations,
            sessionMode,
            pressure,
          });
        }
        continue;
      }

      const preActionTelemetry = getLatestTelemetry();
      const execResult = await executeAction(candidate, telemetry, {
        context,
        setDeferRebuild: (v) => { deferRebuildActive = v; },
      });

      if (execResult.result === "success") {
        context.autoActionsThisTick += 1;

        // Schedule health check
        if (execResult.healthCheckDelayMs) {
          scheduleHealthCheck(
            candidate.action,
            execResult.preState,
            preActionTelemetry,
            () => collectTelemetry(),
            (action, preState, reason) => triggerRollback(action, preState, reason),
            execResult.healthCheckDelayMs
          );
        }
      }
    } else if (candidate.tier === ActionTier.RECOMMEND) {
      addRecommendation(candidate, telemetry);
    } else if (candidate.tier === ActionTier.APPROVE) {
      addPendingApproval(candidate, telemetry);
    } else if (candidate.tier === ActionTier.OBSERVE) {
      // Log minimal observation (only if stale score is notable)
      if (candidate.confidence > 30) {
        writeAuditEvent({
          type: "observation",
          ruleId: candidate.ruleId ?? null,
          action: candidate.action,
          moduleId: candidate.module?.id,
          moduleDisplayName: candidate.module?.displayName ?? null,
          reason: candidate.reason,
          confidence: candidate.confidence,
          sessionMode,
          pressure,
          result: "skipped",
        });
      }
    }
  }

  const tickDurationMs = Date.now() - tickStart;

  // Log high-latency ticks (should be < 100ms)
  if (tickDurationMs > 100) {
    logger.warn(`[optimizer] Slow tick: ${tickDurationMs}ms (tick #${tickCount})`);
  }
}

// ---------------------------------------------------------------------------
// Registry sync from live crawler data
// ---------------------------------------------------------------------------

function syncRegistryFromCrawlers(telemetry) {
  const crawlers = telemetry.crawlers ?? [];
  for (const c of crawlers) {
    if (!c.id) continue;
    const newState = c.active ? ModuleState.ACTIVE : c.enabled ? ModuleState.IDLE : ModuleState.SUSPENDED;
    updateModuleState(c.id, newState, {
      queueSize: c.queueSize,
      activeFetchWorkers: c.activeFetchWorkers,
      lastRunAt: c.lastRunAt,
    });
    if (c.active) {
      noteModuleActivity(c.id, c.lastPromotionCount > 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Kill switch
// ---------------------------------------------------------------------------

/**
 * Activate or deactivate the kill switch.
 * When active: all AUTO actions are blocked.
 *
 * @param {boolean} active
 */
export function setKillSwitch(active) {
  killSwitchActive = Boolean(active);
  try {
    setOptimizerKillSwitch(killSwitchActive);
  } catch {}
  writeAuditEvent({
    type: "kill-switch",
    action: active ? "kill-switch-activated" : "kill-switch-deactivated",
    reason: active ? "Kill switch activated by user" : "Kill switch deactivated by user",
    result: "success",
  });
}

export function setPerformanceMode(mode) {
  const normalized = String(mode || "").trim() || "balanced";
  performanceMode = normalized;
  try {
    persistOptimizerPerformanceMode(normalized);
  } catch {}
  writeAuditEvent({
    type: "observation",
    action: "performance-mode-updated",
    reason: `Optimizer performance mode set to ${normalized}`,
    result: "success",
    meta: { performanceMode: normalized },
  });
  return getOptimizerStatus();
}

// ---------------------------------------------------------------------------
// Status accessors (for API endpoints)
// ---------------------------------------------------------------------------

/**
 * Return current optimizer status for the /api/optimizer/status endpoint.
 */
export function getOptimizerStatus() {
  const telemetry = getLatestTelemetry();
  const supervisor = getSupervisorState();
  const auditSummary = getAuditSummary();

  return {
    running: isRunning,
    tickCount,
    killSwitchActive,
    deferRebuildActive,
    performanceMode,
    currentIntervalMs,
    sessionMode: telemetry?.sessionMode ?? "unknown",
    pressure: telemetry?.pressure ?? { overall: "low" },
    ram: telemetry?.ram ?? null,
    vram: telemetry?.vram ?? null,
    cpu: telemetry?.cpu ?? null,
    crawlers: telemetry?.crawlers ?? [],
    registry: telemetry?.registry ?? null,
    supervisor,
    auditSummary,
    pendingRecommendations: getRecommendations().length,
    pendingApprovals: getPendingApprovals().length,
    capturedAt: telemetry?.capturedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeReadRuntimeSettings() {
  try {
    return readRuntimeSettings();
  } catch {
    return null;
  }
}

function safeReadOptimizerSettings() {
  try {
    return readOptimizerSettings();
  } catch {
    return null;
  }
}

function extractCrawlerIds(settings) {
  try {
    return getCrawlerIds(settings);
  } catch {
    return ["crawler1"];
  }
}

function selectIntervalForMode(sessionMode, pressure) {
  const mode = performanceMode || "balanced";
  const profile =
    mode === "max-performance"
      ? { low: 45_000, moderate: 20_000, high: 10_000, critical: 5_000, active: 12_000 }
      : mode === "low-resource"
        ? { low: 30_000, moderate: 10_000, high: 5_000, critical: 5_000, active: 15_000 }
        : mode === "background-maintenance"
          ? { low: 15_000, moderate: 10_000, high: 5_000, critical: 5_000, active: 30_000 }
          : mode === "emergency"
            ? { low: 5_000, moderate: 5_000, high: 5_000, critical: 5_000, active: 5_000 }
            : INTERVAL_MS;

  return sessionMode === "active" ? profile.active : profile[pressure] ?? profile.low;
}
