/**
 * Optimizer Audit Log
 *
 * Every optimizer action, recommendation, health check, rollback, and safety violation
 * is recorded to a daily rotating JSONL file:
 *   brain/runtime/logs/optimizer/optimizer-audit-YYYY-MM-DD.jsonl
 *
 * Rules:
 * - Write before act: audit entry is created before the action executes
 * - Write-only during normal operation: entries are never deleted
 * - Daily rotation: new file per calendar day
 * - 7-day retention (archival only â€” never purge)
 * - In-memory ring buffer of last 200 events for fast UI access
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOG_DIR = path.join(__dirname, "../brain/runtime/logs/optimizer");
const RING_BUFFER_SIZE = 200;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {object[]} In-memory ring buffer of recent events */
const ringBuffer = [];

let currentDay = "";
let currentFile = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {
    // Non-fatal: log to stderr
    process.stderr.write("[optimizer-audit] Failed to create log directory\n");
  }
}

function getDateStr() {
  return new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
}

function openCurrentFile() {
  const day = getDateStr();
  if (day === currentDay && currentFile) return;

  currentDay = day;
  const filePath = path.join(LOG_DIR, `optimizer-audit-${day}.jsonl`);
  try {
    currentFile = fs.createWriteStream(filePath, { flags: "a", encoding: "utf8" });
  } catch {
    process.stderr.write(`[optimizer-audit] Failed to open audit file: ${filePath}\n`);
    currentFile = null;
  }
}

// ---------------------------------------------------------------------------
// Core write function
// ---------------------------------------------------------------------------

let tickCounter = 0;

/**
 * Write an event to the audit log.
 * This is the only public write function â€” all other code calls this.
 *
 * @param {object} event
 * @param {string} event.type          "action"|"recommendation"|"health-check"|"rollback"|"pressure-change"|"kill-switch"|"violation"|"observation"
 * @param {string} [event.ruleId]
 * @param {string} [event.moduleId]
 * @param {string} [event.moduleDisplayName]
 * @param {string} [event.action]
 * @param {number} [event.tier]        ActionTier value
 * @param {string} [event.tierLabel]
 * @param {number} [event.confidence]  0â€“100
 * @param {number} [event.riskScore]   0â€“100
 * @param {string} [event.reason]
 * @param {string} [event.sessionMode]
 * @param {string} [event.pressure]
 * @param {object} [event.preState]
 * @param {object} [event.postState]
 * @param {string} [event.result]      "success"|"failed"|"skipped"|"rolled-back"
 * @param {boolean} [event.rollbackTriggered]
 * @param {string[]} [event.hardRuleViolations]
 */
export function writeAuditEvent(event) {
  ensureLogDir();
  openCurrentFile();

  const entry = {
    ts: new Date().toISOString(),
    tick: tickCounter,
    type: event.type ?? "observation",
    ruleId: event.ruleId ?? null,
    moduleId: event.moduleId ?? null,
    moduleDisplayName: event.moduleDisplayName ?? null,
    action: event.action ?? null,
    tier: event.tier ?? null,
    tierLabel: event.tierLabel ?? null,
    confidence: typeof event.confidence === "number" ? Math.round(event.confidence) : null,
    riskScore: typeof event.riskScore === "number" ? Math.round(event.riskScore) : null,
    reason: event.reason ?? null,
    sessionMode: event.sessionMode ?? null,
    pressure: event.pressure ?? null,
    preState: event.preState ?? null,
    postState: event.postState ?? null,
    result: event.result ?? null,
    rollbackTriggered: event.rollbackTriggered ?? false,
    hardRuleViolations: event.hardRuleViolations ?? [],
    healthCheckScheduledAt: event.healthCheckScheduledAt ?? null,
    meta: event.meta ?? null,
  };

  // Add to ring buffer
  ringBuffer.push(entry);
  if (ringBuffer.length > RING_BUFFER_SIZE) {
    ringBuffer.shift();
  }

  // Write to disk
  if (currentFile) {
    try {
      currentFile.write(JSON.stringify(entry) + "\n");
    } catch {
      // Non-fatal disk write failure
      process.stderr.write("[optimizer-audit] Failed to write audit entry\n");
    }
  }

  return entry;
}

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

/**
 * Increment the tick counter. Called once per control loop tick.
 */
export function incrementAuditTick() {
  tickCounter += 1;
}

/**
 * Return a copy of recent audit events from the ring buffer.
 * @param {number} [limit]  Max number of entries (newest first)
 * @returns {object[]}
 */
export function getRecentAuditEvents(limit = 100) {
  const clamped = Math.min(Math.max(1, limit), RING_BUFFER_SIZE);
  return [...ringBuffer].reverse().slice(0, clamped);
}

/**
 * Return summary stats of recent audit events (last 24h from ring buffer).
 * @returns {object}
 */
export function getAuditSummary() {
  const counts = {};
  const resultCounts = {};
  let rollbackCount = 0;
  let violationCount = 0;

  for (const e of ringBuffer) {
    counts[e.type] = (counts[e.type] || 0) + 1;
    if (e.result) resultCounts[e.result] = (resultCounts[e.result] || 0) + 1;
    if (e.rollbackTriggered) rollbackCount += 1;
    if (e.type === "violation") violationCount += 1;
  }

  return {
    totalEvents: ringBuffer.length,
    countsByType: counts,
    countsByResult: resultCounts,
    rollbackCount,
    violationCount,
    currentTick: tickCounter,
    bufferSize: RING_BUFFER_SIZE,
  };
}

/**
 * Close the current log file stream (for graceful shutdown).
 */
export function closeAuditLog() {
  if (currentFile) {
    try {
      currentFile.end();
    } catch {
      // ignore
    }
    currentFile = null;
  }
}

