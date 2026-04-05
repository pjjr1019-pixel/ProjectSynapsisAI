import { getLatestOsSnapshot, getLatestTelemetry } from "./optimizer-telemetry.mjs";
import {
  loadPendingEnrichmentQueue,
  loadSeenRegistry,
  savePendingEnrichmentQueue,
  saveSeenRegistry,
} from "./process-knowledge-registry.mjs";
import {
  buildProcessKnowledgeIdentity,
  fingerprintChangeReasons,
} from "./process-knowledge-identity.mjs";

const BASE_INTERVAL_MS = 8_000;
const SLOW_INTERVAL_MS = 30_000;
const MAX_SEEN_KEYS = 5_000;
const STALE_SNAPSHOT_MS = 60_000;

const IGNORED_PROCESS_NAMES = new Set([
  "csrss",
  "dwm",
  "fontdrvhost",
  "idle",
  "lsass",
  "registry",
  "services",
  "smss",
  "system",
  "system-idle-process",
  "wininit",
  "winlogon",
]);

const QUEUE_PRIORITY_BY_REASON = {
  manual: 10,
  signer_changed: 7,
  version_changed: 5,
  hash_changed: 5,
  retry_due: 4,
  ttl_expired: 3,
  new_identity: 1,
};

let isRunning = false;
let loopTimerId = null;
let logger = console;
let currentIntervalMs = BASE_INTERVAL_MS;
let tickCount = 0;
let seenKeysThisSession = new Set();
let lastTickSnapshot = {
  startedAt: null,
  completedAt: null,
  status: "idle",
  reason: "not_started",
  processedCount: 0,
  updatedCount: 0,
  queuedCount: 0,
  ignoredCount: 0,
  skippedCount: 0,
  registryCount: 0,
  queueCount: 0,
  intervalMs: BASE_INTERVAL_MS,
  snapshotAgeMs: null,
  pressure: "unknown",
};

function safeLog(level, message, details) {
  const sink = logger && typeof logger[level] === "function" ? logger[level] : logger?.log;
  if (typeof sink === "function") {
    if (details === undefined) {
      sink.call(logger, message);
      return;
    }
    sink.call(logger, message, details);
  }
}

function toText(value) {
  return String(value ?? "").trim();
}

function normalizeProcessRows(snapshot) {
  const rows = Array.isArray(snapshot?.processes) ? snapshot.processes : Array.isArray(snapshot?.processRows) ? snapshot.processRows : [];
  return rows
    .map((row) => ({
      ...row,
      processName: toText(row?.processName ?? row?.name ?? row?.imageName ?? row?.process ?? ""),
      name: toText(row?.processName ?? row?.name ?? row?.imageName ?? row?.process ?? ""),
      path: toText(row?.path ?? row?.filePath ?? row?.executablePath ?? ""),
      signer: row?.signer ?? row?.publisher ?? row?.signaturePublisher ?? null,
      version: row?.fileVersion ?? row?.version ?? row?.productVersion ?? null,
      productName: row?.productName ?? row?.displayName ?? row?.product ?? null,
    }))
    .filter((row) => row.processName);
}

function isIgnoredName(imageName) {
  return IGNORED_PROCESS_NAMES.has(String(imageName || "").toLowerCase());
}

function getSnapshotAgeMs(snapshot) {
  const capturedAt = snapshot?.capturedAt || snapshot?.timestamp || snapshot?.collectedAt || snapshot?.updatedAt;
  const time = Date.parse(capturedAt || "");
  return Number.isFinite(time) ? Math.max(0, Date.now() - time) : null;
}

function isHighPressureTelemetry(telemetry) {
  const overall = String(telemetry?.pressure?.overall || "").toLowerCase();
  return overall === "high" || overall === "critical";
}

function mapQueueReason(existingEntry, observedReasons, isRetryDue, isNewIdentity) {
  if (isNewIdentity) return "new_identity";
  if (isRetryDue) return "retry_due";
  if (observedReasons.includes("signing_status")) return "signer_changed";
  if (observedReasons.includes("last_signer")) return "signer_changed";
  if (observedReasons.includes("last_version")) return "version_changed";
  if (observedReasons.includes("last_sha256_prefix")) return "hash_changed";
  if (observedReasons.includes("last_path")) return "path_changed";
  if (observedReasons.includes("last_enriched")) return "ttl_expired";
  if (existingEntry?.status === "pending") return "new_identity";
  return "manual";
}

function queuePriorityForReason(reason) {
  return QUEUE_PRIORITY_BY_REASON[reason] || 1;
}

function computeObservedPatch(identity, row, nowIso) {
  return {
    identity_key: identity.identity_key,
    image_name: identity.image_name,
    status: "pending",
    first_seen: nowIso,
    last_seen: nowIso,
    last_enriched: null,
    md_file: null,
    last_path: identity.last_path,
    last_signer: row.signer ? toText(row.signer) : undefined,
    last_version: row.version ? toText(row.version) : undefined,
    last_sha256_prefix: identity.sha256_prefix,
    hash_type: identity.hash_type,
    product_name: row.productName ? toText(row.productName) : undefined,
    command_line: row.commandLine ? toText(row.commandLine) : undefined,
    username: row.username ? toText(row.username) : undefined,
    company_name: row.companyName ? toText(row.companyName) : undefined,
    file_version: row.fileVersion ? toText(row.fileVersion) : undefined,
    original_filename: row.originalFilename ? toText(row.originalFilename) : undefined,
    signer_name: row.signerName ? toText(row.signerName) : undefined,
    signing_status: row.signingStatus ? toText(row.signingStatus) : undefined,
    last_sha256: row.sha256 ? toText(row.sha256) : undefined,
    publisher: identity.publisher ? identity.publisher : undefined,
    publisher_slug: identity.publisher_slug,
    enrichment_query: null,
    confidence: 0,
    stale: false,
  };
}

function compactPatch(patch) {
  const out = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

function mergeObservedFields(existingEntry, observedPatch) {
  const next = { ...(existingEntry || {}) };
  for (const [key, value] of Object.entries(observedPatch || {})) {
    if (value === undefined || value === null) continue;
    if (key === "first_seen") continue;
    if (key === "publisher" || key === "product_name" || key === "last_signer" || key === "last_version") {
      if (!next[key] || next[key] === "unknown") {
        next[key] = value;
      }
      continue;
    }
    if (key === "last_path") {
      next.last_path = value;
      continue;
    }
    if (key === "last_sha256_prefix") {
      next.last_sha256_prefix = value;
      continue;
    }
    if (key === "hash_type") {
      next.hash_type = value;
      continue;
    }
    if (key === "publisher_slug") {
      next.publisher_slug = value || next.publisher_slug || "unknown";
      continue;
    }
    if (key === "confidence") {
      next.confidence = Number.isFinite(Number(value)) ? Number(value) : next.confidence || 0;
      continue;
    }
    next[key] = value;
  }
  return next;
}

function normalizeRegistryEntry(existingEntry, identity, nowIso) {
  return {
    identity_key: identity.identity_key,
    image_name: identity.image_name,
    status: String(existingEntry?.status || "pending").toLowerCase(),
    first_seen: existingEntry?.first_seen || nowIso,
    last_seen: existingEntry?.last_seen || nowIso,
    last_enriched: existingEntry?.last_enriched || null,
    failure_count: Math.max(0, Math.floor(Number(existingEntry?.failure_count || 0)) || 0),
    next_retry_at: existingEntry?.next_retry_at || null,
    md_file: existingEntry?.md_file || null,
    last_path: existingEntry?.last_path || identity.last_path || null,
    last_signer: existingEntry?.last_signer || null,
    last_version: existingEntry?.last_version || null,
    last_sha256_prefix: existingEntry?.last_sha256_prefix || identity.sha256_prefix,
    hash_type: existingEntry?.hash_type || identity.hash_type,
    product_name: existingEntry?.product_name || null,
    publisher: existingEntry?.publisher || identity.publisher || null,
    publisher_slug: existingEntry?.publisher_slug || identity.publisher_slug,
    enrichment_query: existingEntry?.enrichment_query || null,
    confidence: Number.isFinite(Number(existingEntry?.confidence)) ? Number(existingEntry.confidence) : 0,
    stale: Boolean(existingEntry?.stale),
  };
}

function queueEntryForIdentity(queue, identityKey, priority, reason, nowIso) {
  const existingIndex = queue.findIndex((entry) => String(entry?.key || "") === identityKey);
  if (existingIndex >= 0) {
    if (priority > Number(queue[existingIndex].priority || 0)) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        priority,
        reason,
      };
      return true;
    }
    return false;
  }
  queue.push({
    key: identityKey,
    priority,
    queued_at: nowIso,
    reason,
  });
  return true;
}

function shouldQueueExistingEntry(existingEntry, reasons, pendingKeys, nowIso) {
  const status = String(existingEntry?.status || "pending").toLowerCase();
  if (status === "ignored") return { queue: false, reason: "ignored" };
  if (status === "pending" || status === "enriching") {
    return { queue: !pendingKeys.has(existingEntry.identity_key), reason: "manual" };
  }
  if (status === "failed") {
    const retryAt = existingEntry?.next_retry_at ? Date.parse(existingEntry.next_retry_at) : null;
    const failureCount = Math.max(0, Math.floor(Number(existingEntry?.failure_count || 0)) || 0);
    const permanentFailure = failureCount >= 5;
    if (permanentFailure) return { queue: false, reason: "failed" };
    if (Number.isFinite(retryAt) && retryAt > Date.now()) return { queue: false, reason: "retry_pending" };
    return { queue: true, reason: "retry_due" };
  }
  if (reasons.length > 0) {
    return { queue: !pendingKeys.has(existingEntry.identity_key), reason: mapQueueReason(existingEntry, reasons, false, false) };
  }
  return { queue: false, reason: "known" };
}

function scheduleNextTick(nextReason = "idle", queueDepth = 0) {
  if (!isRunning) return;
  const slowDown = queueDepth >= 5 || nextReason === "pressure_skip" || nextReason === "snapshot_stale" || nextReason === "session_limit";
  currentIntervalMs = slowDown ? SLOW_INTERVAL_MS : BASE_INTERVAL_MS;
  loopTimerId = setTimeout(async () => {
    try {
      await runTick();
    } catch (error) {
      lastTickSnapshot = {
        ...lastTickSnapshot,
        completedAt: new Date().toISOString(),
        status: "error",
        reason: String(error?.message || error),
      };
      safeLog("error", "[process-knowledge] tick error", error?.message || error);
    }
    scheduleNextTick(lastTickSnapshot.reason, lastTickSnapshot.queueCount || 0);
  }, currentIntervalMs);
}

async function runTick() {
  const startedAt = Date.now();
  tickCount += 1;
  const nowIso = new Date(startedAt).toISOString();
  const snapshot = getLatestOsSnapshot();
  const telemetry = getLatestTelemetry();
  const snapshotAgeMs = getSnapshotAgeMs(snapshot);

  lastTickSnapshot = {
    ...lastTickSnapshot,
    startedAt: nowIso,
    completedAt: null,
    status: "running",
    reason: "running",
    processedCount: 0,
    updatedCount: 0,
    queuedCount: 0,
    ignoredCount: 0,
    skippedCount: 0,
    registryCount: 0,
    queueCount: 0,
    intervalMs: currentIntervalMs,
    snapshotAgeMs,
    pressure: String(telemetry?.pressure?.overall || "unknown"),
  };

  if (seenKeysThisSession.size >= MAX_SEEN_KEYS) {
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "skipped",
      reason: "session_limit",
    };
    safeLog("warn", "[process-knowledge] session limit reached; listener paused until restart");
    return;
  }

  if (!snapshot || !Array.isArray(snapshot.processes) || !snapshot.processes.length) {
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "skipped",
      reason: "no_snapshot",
    };
    return;
  }

  if (snapshotAgeMs !== null && snapshotAgeMs > STALE_SNAPSHOT_MS) {
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "skipped",
      reason: "snapshot_stale",
    };
    safeLog("warn", "[process-knowledge] skipping stale OS snapshot", { snapshotAgeMs });
    return;
  }

  if (isHighPressureTelemetry(telemetry)) {
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "skipped",
      reason: "pressure_skip",
    };
    safeLog("warn", "[process-knowledge] skipping tick because optimizer pressure is high", {
      pressure: telemetry?.pressure?.overall,
    });
    return;
  }

  const registry = loadSeenRegistry();
  const queue = loadPendingEnrichmentQueue();
  const pendingKeys = new Set(queue.map((entry) => String(entry?.key || "")).filter(Boolean));
  const processRows = normalizeProcessRows(snapshot);
  const processedThisTick = new Set();
  let registryDirty = false;
  let queueDirty = false;
  let processedCount = 0;
  let updatedCount = 0;
  let queuedCount = 0;
  let ignoredCount = 0;
  let skippedCount = 0;

  for (const row of processRows) {
    const identity = buildProcessKnowledgeIdentity(row);
    const imageName = String(identity.image_name || "").toLowerCase();
    if (!identity.identity_key || !imageName) continue;
    if (processedThisTick.has(identity.identity_key)) continue;
    processedThisTick.add(identity.identity_key);
    seenKeysThisSession.add(identity.identity_key);
    processedCount += 1;

    if (isIgnoredName(imageName)) {
      ignoredCount += 1;
      continue;
    }

    const existingEntry = registry[identity.identity_key] || null;
    const observedPatch = computeObservedPatch(identity, row, nowIso);
    const mergedEntry = normalizeRegistryEntry(existingEntry, identity, nowIso);
    const queueDecision = shouldQueueExistingEntry(existingEntry || mergedEntry, fingerprintChangeReasons(existingEntry || mergedEntry, observedPatch, new Date(startedAt)), pendingKeys, nowIso);
    const shouldQueue = queueDecision.queue;
    const queueReason = queueDecision.reason;
    const hasPendingQueueEntry = pendingKeys.has(identity.identity_key);

    const updatedEntry = mergeObservedFields(mergedEntry, compactPatch(observedPatch));
    updatedEntry.last_seen = nowIso;
    updatedEntry.identity_key = identity.identity_key;
    updatedEntry.image_name = identity.image_name;
    updatedEntry.publisher_slug = updatedEntry.publisher_slug || identity.publisher_slug || "unknown";
    updatedEntry.hash_type = updatedEntry.hash_type || identity.hash_type;
    updatedEntry.last_sha256_prefix = updatedEntry.last_sha256_prefix || identity.sha256_prefix;
    updatedEntry.last_path = updatedEntry.last_path || identity.last_path || null;
    updatedEntry.confidence = Number.isFinite(Number(updatedEntry.confidence)) ? Number(updatedEntry.confidence) : 0;

    if (!existingEntry) {
      updatedEntry.first_seen = nowIso;
      updatedEntry.status = shouldQueue ? "pending" : "pending";
      registry[identity.identity_key] = updatedEntry;
      registryDirty = true;
      if (shouldQueue) {
        const nextQueued = queueEntryForIdentity(queue, identity.identity_key, queuePriorityForReason(queueReason), queueReason, nowIso);
        queueDirty = queueDirty || nextQueued;
        queuedCount += 1;
      }
      continue;
    }

    const reasons = fingerprintChangeReasons(existingEntry, updatedEntry, new Date(startedAt));
    const canQueueForChanges = reasons.length > 0 && shouldQueue;
    if (canQueueForChanges) {
      updatedEntry.status = "pending";
      updatedEntry.stale = true;
      const nextQueued = queueEntryForIdentity(queue, identity.identity_key, queuePriorityForReason(queueReason), queueReason, nowIso);
      queueDirty = queueDirty || nextQueued;
      queuedCount += 1;
    } else if (shouldQueue && !hasPendingQueueEntry) {
      updatedEntry.status = "pending";
      const nextQueued = queueEntryForIdentity(queue, identity.identity_key, queuePriorityForReason(queueReason), queueReason, nowIso);
      queueDirty = queueDirty || nextQueued;
      queuedCount += 1;
    } else if (hasPendingQueueEntry && (existingEntry.status === "pending" || existingEntry.status === "enriching")) {
      updatedEntry.status = existingEntry.status === "enriching" ? "enriching" : "pending";
      if (reasons.length > 0) {
        updatedEntry.stale = true;
      }
    } else if (existingEntry.status !== "ignored") {
      updatedEntry.status = existingEntry.status || updatedEntry.status || "known";
      if (reasons.length > 0) {
        updatedEntry.stale = true;
      }
    }

    if (existingEntry.status !== updatedEntry.status || JSON.stringify(existingEntry) !== JSON.stringify(updatedEntry)) {
      registry[identity.identity_key] = updatedEntry;
      registryDirty = true;
      updatedCount += 1;
    } else {
      registry[identity.identity_key] = updatedEntry;
    }

    if (!shouldQueue && existingEntry.status !== "ignored") {
      skippedCount += 1;
    }
  }

  if (registryDirty) {
    saveSeenRegistry(registry);
  }
  if (queueDirty) {
    savePendingEnrichmentQueue(queue);
  }

  lastTickSnapshot = {
    ...lastTickSnapshot,
    completedAt: new Date().toISOString(),
    status: "succeeded",
    reason: "tick_complete",
    processedCount,
    updatedCount,
    queuedCount,
    ignoredCount,
    skippedCount,
    registryCount: Object.keys(registry).length,
    queueCount: queue.length,
    intervalMs: currentIntervalMs,
  };

  if (processedCount > 0 || queuedCount > 0 || updatedCount > 0 || ignoredCount > 0) {
    safeLog("log", "[process-knowledge] tick summary", {
      processedCount,
      updatedCount,
      queuedCount,
      ignoredCount,
      skippedCount,
      registryCount: Object.keys(registry).length,
      queueCount: queue.length,
      intervalMs: currentIntervalMs,
    });
  }
}

export function startProcessKnowledgeListener(opts = {}) {
  if (isRunning) return;
  isRunning = true;
  logger = opts.logger ?? console;
  currentIntervalMs = BASE_INTERVAL_MS;
  lastTickSnapshot = {
    ...lastTickSnapshot,
    startedAt: null,
    completedAt: null,
    status: "starting",
    reason: "starting",
    intervalMs: currentIntervalMs,
  };
  safeLog("log", "[process-knowledge] listener starting");
  scheduleNextTick("idle", 0);
}

export function stopProcessKnowledgeListener() {
  isRunning = false;
  if (loopTimerId) {
    clearTimeout(loopTimerId);
    loopTimerId = null;
  }
  lastTickSnapshot = {
    ...lastTickSnapshot,
    completedAt: new Date().toISOString(),
    status: "stopped",
    reason: "stopped",
  };
  safeLog("log", "[process-knowledge] listener stopped");
}

export function clearProcessKnowledgeListenerState() {
  seenKeysThisSession = new Set();
  tickCount = 0;
  lastTickSnapshot = {
    startedAt: null,
    completedAt: null,
    status: "idle",
    reason: "cleared",
    processedCount: 0,
    updatedCount: 0,
    queuedCount: 0,
    ignoredCount: 0,
    skippedCount: 0,
    registryCount: 0,
    queueCount: 0,
    intervalMs: BASE_INTERVAL_MS,
    snapshotAgeMs: null,
    pressure: "unknown",
  };
}

export function getProcessKnowledgeListenerSnapshot() {
  return {
    isRunning,
    tickCount,
    intervalMs: currentIntervalMs,
    seenKeysCount: seenKeysThisSession.size,
    ...lastTickSnapshot,
  };
}
