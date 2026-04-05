/**
 * Optimizer Telemetry Collector
 *
 * Collects a unified telemetry snapshot from all available sources:
 * - OS RAM (os.freemem / os.totalmem)
 * - Node.js heap (process.memoryUsage)
 * - Idle training / crawler state (INTERACTIVE_STATE + runtimeStates)
 * - Module registry summary
 * - GPU data when available (from Electron snapshot)
 *
 * The telemetry collector itself must be cheap to run:
 * - No subprocess spawning
 * - No disk I/O
 * - No sorting large arrays
 * - Completes within 5ms on target hardware
 */

import os from "node:os";
import { getRegistrySummary } from "./optimizer-registry.mjs";
import {
  getIdleTrainingSystemSnapshot,
  getInteractiveState,
} from "./brain-idle-training.mjs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Pressure thresholds for RAM (usedRatio 0–1)
const RAM_MODERATE_RATIO = 0.60;
const RAM_HIGH_RATIO = 0.78;
const RAM_CRITICAL_RATIO = 0.88;

// Pressure thresholds for VRAM (usedRatio 0–1)
const VRAM_MODERATE_RATIO = 0.65;
const VRAM_HIGH_RATIO = 0.80;
const VRAM_CRITICAL_RATIO = 0.90;

// Session mode timing
const ACTIVE_SESSION_GRACE_MS = 20_000;   // 20s after last request still "active"
const IDLE_SESSION_GRACE_MS = 300_000;    // 5 min before becoming "background"

// Ring buffer size for history
const HISTORY_MAX_SNAPSHOTS = 60;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {object[]} Rolling history of snapshots */
const snapshotHistory = [];

/** Latest Windows OS snapshot forwarded from Electron */
let latestOsSnapshot = null;

// ---------------------------------------------------------------------------
// Pressure calculation
// ---------------------------------------------------------------------------

/**
 * @param {number} ratio  0–1
 * @param {number} moderate
 * @param {number} high
 * @param {number} critical
 * @returns {"low"|"moderate"|"high"|"critical"}
 */
function pressureFromRatio(ratio, moderate, high, critical) {
  if (ratio >= critical) return "critical";
  if (ratio >= high) return "high";
  if (ratio >= moderate) return "moderate";
  return "low";
}

const PRESSURE_RANK = { low: 0, moderate: 1, high: 2, critical: 3 };
const PRESSURE_BY_RANK = ["low", "moderate", "high", "critical"];

function maxPressure(...levels) {
  const rank = Math.max(...levels.map((l) => PRESSURE_RANK[l] ?? 0));
  return PRESSURE_BY_RANK[rank] ?? "low";
}

// ---------------------------------------------------------------------------
// Session mode detection
// ---------------------------------------------------------------------------

/**
 * Determine the current user session mode.
 * Uses INTERACTIVE_STATE from brain-idle-training.mjs.
 *
 * @param {object} interactiveState  { activeRequests, lastInteractiveAt }
 * @returns {"active"|"idle"|"background"}
 */
export function computeSessionMode(interactiveState) {
  if (!interactiveState) return "background";
  const { activeRequests, lastInteractiveAt } = interactiveState;

  if (activeRequests > 0) return "active";

  const msSince = Date.now() - (lastInteractiveAt || 0);
  if (msSince < ACTIVE_SESSION_GRACE_MS) return "active";
  if (msSince < IDLE_SESSION_GRACE_MS) return "idle";
  return "background";
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

/**
 * Collect a full telemetry snapshot synchronously.
 * This is the primary function called by the control loop each tick.
 *
 * @returns {object}  TelemetrySnapshot
 */
export function collectTelemetry() {
  const now = Date.now();

  // --- RAM ---
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const usedRatio = totalBytes > 0 ? usedBytes / totalBytes : 0;

  const ramPressure = pressureFromRatio(
    usedRatio,
    RAM_MODERATE_RATIO,
    RAM_HIGH_RATIO,
    RAM_CRITICAL_RATIO
  );

  // --- Node.js heap ---
  const heapUsage = process.memoryUsage();

  // --- Interactive state ---
  const interactiveState = safeGetInteractiveState();
  const sessionMode = computeSessionMode(interactiveState);

  // --- Crawlers ---
  const crawlerSystem = safeGetCrawlerSystem();

  // --- VRAM (from Electron OS snapshot) ---
  const vram = extractVram(latestOsSnapshot);
  const vramPressure = vram.usedRatio !== null
    ? pressureFromRatio(vram.usedRatio, VRAM_MODERATE_RATIO, VRAM_HIGH_RATIO, VRAM_CRITICAL_RATIO)
    : "low";  // unknown → assume low (don't act on missing data)

  // --- CPU (hint from OS snapshot) ---
  const cpuPercentHint = latestOsSnapshot?.totalCpuPercentHint ?? null;
  const cpuPressure = cpuPercentHint !== null
    ? pressureFromRatio(cpuPercentHint / 100, 0.35, 0.65, 0.80)
    : "low";

  // --- Registry ---
  const registrySummary = safeGetRegistry();

  // --- Build snapshot ---
  const snap = {
    capturedAt: new Date(now).toISOString(),
    uptimeMs: now,
    sessionMode,
    interactiveRequestCount: interactiveState?.activeRequests ?? 0,
    lastInteractiveAt: interactiveState?.lastInteractiveAt
      ? new Date(interactiveState.lastInteractiveAt).toISOString()
      : null,

    ram: {
      totalMB: Math.round(totalBytes / (1024 * 1024)),
      freeMB: Math.round(freeBytes / (1024 * 1024)),
      usedMB: Math.round(usedBytes / (1024 * 1024)),
      usedRatio: Math.round(usedRatio * 1000) / 1000,
      heapUsedMB: Math.round(heapUsage.heapUsed / (1024 * 1024)),
      heapTotalMB: Math.round(heapUsage.heapTotal / (1024 * 1024)),
      externalMB: Math.round(heapUsage.external / (1024 * 1024)),
    },

    vram,
    cpu: {
      percentHint: cpuPercentHint,
      logicalCores: os.cpus().length,
    },

    crawlers: crawlerSystem.crawlers,
    builds: crawlerSystem.builds,

    pressure: {
      ram: ramPressure,
      vram: vramPressure,
      cpu: cpuPressure,
      overall: maxPressure(ramPressure, vramPressure, cpuPressure),
    },

    registry: registrySummary,
  };

  // Append to rolling history
  snapshotHistory.push(snap);
  if (snapshotHistory.length > HISTORY_MAX_SNAPSHOTS) {
    snapshotHistory.shift();
  }

  return snap;
}

// ---------------------------------------------------------------------------
// History access
// ---------------------------------------------------------------------------

/**
 * Return the rolling snapshot history (newest last).
 * @returns {object[]}
 */
export function getTelemetryHistory() {
  return [...snapshotHistory];
}

/**
 * Return the most recent snapshot, or null if none collected yet.
 * @returns {object|null}
 */
export function getLatestTelemetry() {
  return snapshotHistory.length > 0 ? snapshotHistory[snapshotHistory.length - 1] : null;
}

export function getLatestOsSnapshot() {
  return latestOsSnapshot;
}

/**
 * Accept an OS snapshot forwarded from Electron (contains GPU data, per-process data).
 * Call this from the /api/optimizer/os-snapshot route.
 *
 * @param {object} snapshot  Windows OS snapshot from task-manager-core
 */
export function acceptOsSnapshot(snapshot) {
  latestOsSnapshot = snapshot && typeof snapshot === "object" ? snapshot : null;
}

// ---------------------------------------------------------------------------
// Safe wrappers (never throw into the control loop)
// ---------------------------------------------------------------------------

function safeGetInteractiveState() {
  try {
    return getInteractiveState();
  } catch {
    return { activeRequests: 0, lastInteractiveAt: 0 };
  }
}

function safeGetCrawlerSystem() {
  try {
    const system = getIdleTrainingSystemSnapshot();
    return {
      crawlers: (system.crawlers || []).map((c) => ({
        id: c.crawlerId,
        enabled: Boolean(c.idleTrainingEnabled),
        active: Boolean(c.idleTrainingActive),
        queueSize: Number(c.idleTrainingQueueSize || 0),
        activeFetchWorkers: Number(c.idleTrainingActiveFetchWorkers || 0),
        lastRunAt: c.idleTrainingLastRunAt ?? null,
        lastPromotionCount: Number(c.idleTrainingLastPromotionCount || 0),
        cycleActive: false,  // approximation from available data
      })),
      builds: {
        activeCount: 0,  // TODO: connect to brain-ir-builder tracking in Phase 2
        pendingCount: 0,
        lastCompletedAt: null,
      },
    };
  } catch {
    return { crawlers: [], builds: { activeCount: 0, pendingCount: 0, lastCompletedAt: null } };
  }
}

function safeGetRegistry() {
  try {
    return getRegistrySummary();
  } catch {
    return {
      totalModules: 0,
      activeModules: 0,
      idleModules: 0,
      suspendedModules: 0,
      failedModules: 0,
      unloadedModules: 0,
    };
  }
}

function extractVram(osSnapshot) {
  if (!osSnapshot) {
    return { dedicatedMB: null, sharedMB: null, usedRatio: null };
  }
  try {
    // Aggregate GPU memory from all process groups if available
    const processes = osSnapshot.processes || [];
    let totalDedicatedBytes = 0;
    for (const p of processes) {
      totalDedicatedBytes += Number(p.gpuDedicatedBytes || 0);
    }
    if (totalDedicatedBytes === 0) {
      return { dedicatedMB: null, sharedMB: null, usedRatio: null };
    }
    const dedicatedMB = Math.round(totalDedicatedBytes / (1024 * 1024));
    return {
      dedicatedMB,
      sharedMB: null,
      usedRatio: null,  // total VRAM capacity not available without direct GPU query
    };
  } catch {
    return { dedicatedMB: null, sharedMB: null, usedRatio: null };
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Compare two pressure levels. Returns positive if a > b, 0 if equal, negative if a < b.
 */
export function comparePressure(a, b) {
  return (PRESSURE_RANK[a] ?? 0) - (PRESSURE_RANK[b] ?? 0);
}

/**
 * Check whether a module has been idle for at least the given duration.
 * Helper used by both telemetry and policy.
 *
 * @param {object} module  Registry entry
 * @param {number} ms      Idle threshold in milliseconds
 */
export function isModuleIdleFor(module, ms) {
  return (Date.now() - (module.lastActiveAt || 0)) >= ms;
}

/**
 * Clear snapshot history (primarily for testing).
 */
export function clearTelemetryHistory() {
  snapshotHistory.length = 0;
}
