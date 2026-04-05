import fs from "node:fs";
import path from "node:path";
import { ensureDir, stableStringify } from "./brain-build-utils.mjs";
import { scanForPii } from "./brain-compliance.mjs";
import { getProcessKnowledgePaths } from "./process-knowledge-paths.mjs";
import { sanitizePath } from "./process-knowledge-identity.mjs";

const REGISTRY_STATUSES = new Set([
  "pending",
  "enriching",
  "resolved_high_confidence",
  "resolved_medium_confidence",
  "low_confidence",
  "unresolved",
  "conflicted",
  "failed",
  "ignored",
]);

const nextRetryScheduleMs = [5 * 60 * 1000, 30 * 60 * 1000, 4 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000];

let registryWriteLock = false;
let seenRegistryCache = { mtime: 0, data: null };
let pendingQueueCache = { mtime: 0, data: null };

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function toText(value) {
  return String(value ?? "").trim();
}

function clampConfidence(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(100, Math.round(next)));
}

function normalizeStatus(value) {
  const status = toText(value).toLowerCase();
  if (status === "known") return "resolved_medium_confidence";
  if (status === "suspicious") return "low_confidence";
  if (status === "unknown" || status === "queued") return "pending";
  return REGISTRY_STATUSES.has(status) ? status : "pending";
}

function normalizeIso(value) {
  if (value === null) return null;
  const text = toText(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function normalizeOptionalText(value) {
  const text = toText(value);
  return text ? text : null;
}

function readJsonCached(filePath, fallback, cache) {
  if (!fs.existsSync(filePath)) {
    cache.mtime = 0;
    cache.data = cloneJson(fallback);
    return cloneJson(fallback);
  }
  const stat = fs.statSync(filePath);
  if (cache.data !== null && cache.mtime === stat.mtimeMs) {
    return cloneJson(cache.data);
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    cache.mtime = stat.mtimeMs;
    cache.data = cloneJson(data);
    return cloneJson(data);
  } catch {
    cache.mtime = stat.mtimeMs;
    cache.data = cloneJson(fallback);
    return cloneJson(fallback);
  }
}

function writeJsonAtomic(filePath, value, cache) {
  if (registryWriteLock) {
    return { changed: false, locked: true, bytes: 0 };
  }
  registryWriteLock = true;
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    const next = `${stableStringify(value)}\n`;
    const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    if (prev === next) {
      const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      cache.mtime = stat ? stat.mtimeMs : Date.now();
      cache.data = cloneJson(value);
      return { changed: false, locked: false, bytes: Buffer.byteLength(next, "utf8") };
    }
    const tempPath = path.join(
      dir,
      `${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
    );
    fs.writeFileSync(tempPath, next, "utf8");
    fs.renameSync(tempPath, filePath);
    const stat = fs.statSync(filePath);
    cache.mtime = stat.mtimeMs;
    cache.data = cloneJson(value);
    return { changed: true, locked: false, bytes: Buffer.byteLength(next, "utf8") };
  } finally {
    registryWriteLock = false;
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function normalizeRegistryPatch(patch = {}) {
  const next = {};
  if (!patch || typeof patch !== "object") return next;

  if (hasOwn(patch, "identity_key") && patch.identity_key !== undefined) {
    next.identity_key = toText(patch.identity_key);
  }
  if (hasOwn(patch, "image_name") && patch.image_name !== undefined) {
    next.image_name = toText(patch.image_name) || "unknown";
  }
  if (hasOwn(patch, "status") && patch.status !== undefined) {
    next.status = normalizeStatus(patch.status);
  }
  if (hasOwn(patch, "first_seen") && patch.first_seen !== undefined) {
    next.first_seen = normalizeIso(patch.first_seen);
  }
  if (hasOwn(patch, "last_seen") && patch.last_seen !== undefined) {
    next.last_seen = normalizeIso(patch.last_seen);
  }
  if (hasOwn(patch, "last_enriched") && patch.last_enriched !== undefined) {
    next.last_enriched = normalizeIso(patch.last_enriched);
  }
  if (hasOwn(patch, "failure_count") && patch.failure_count !== undefined) {
    next.failure_count = Math.max(0, Math.floor(Number(patch.failure_count) || 0));
  }
  if (hasOwn(patch, "next_retry_at") && patch.next_retry_at !== undefined) {
    next.next_retry_at = normalizeIso(patch.next_retry_at);
  }
  if (hasOwn(patch, "md_file") && patch.md_file !== undefined) {
    next.md_file = normalizeOptionalText(patch.md_file);
  }
  if (hasOwn(patch, "file_name") && patch.file_name !== undefined) {
    next.md_file = normalizeOptionalText(patch.file_name);
  }
  if (hasOwn(patch, "last_path") && patch.last_path !== undefined) {
    const rawPath = toText(patch.last_path);
    if (rawPath) {
      scanForPii(rawPath);
      next.last_path = sanitizePath(rawPath);
    } else {
      next.last_path = null;
    }
  }
  if (hasOwn(patch, "path") && patch.path !== undefined) {
    const rawPath = toText(patch.path);
    if (rawPath) {
      scanForPii(rawPath);
      next.last_path = sanitizePath(rawPath);
    } else {
      next.last_path = null;
    }
  }
  if (hasOwn(patch, "filePath") && patch.filePath !== undefined) {
    const rawPath = toText(patch.filePath);
    if (rawPath) {
      scanForPii(rawPath);
      next.last_path = sanitizePath(rawPath);
    } else {
      next.last_path = null;
    }
  }
  if (hasOwn(patch, "executablePath") && patch.executablePath !== undefined) {
    const rawPath = toText(patch.executablePath);
    if (rawPath) {
      scanForPii(rawPath);
      next.last_path = sanitizePath(rawPath);
    } else {
      next.last_path = null;
    }
  }
  if (hasOwn(patch, "last_signer") && patch.last_signer !== undefined) {
    next.last_signer = normalizeOptionalText(patch.last_signer);
  }
  if (hasOwn(patch, "signer") && patch.signer !== undefined) {
    next.last_signer = normalizeOptionalText(patch.signer);
  }
  if (hasOwn(patch, "last_version") && patch.last_version !== undefined) {
    next.last_version = normalizeOptionalText(patch.last_version);
  }
  if (hasOwn(patch, "version") && patch.version !== undefined) {
    next.last_version = normalizeOptionalText(patch.version);
  }
  if (hasOwn(patch, "last_sha256_prefix") && patch.last_sha256_prefix !== undefined) {
    next.last_sha256_prefix = normalizeOptionalText(patch.last_sha256_prefix);
  }
  if (hasOwn(patch, "last_sha256") && patch.last_sha256 !== undefined) {
    next.last_sha256 = normalizeOptionalText(patch.last_sha256);
  }
  if (hasOwn(patch, "sha256") && patch.sha256 !== undefined) {
    next.last_sha256 = normalizeOptionalText(patch.sha256);
  }
  if (hasOwn(patch, "sha256_prefix") && patch.sha256_prefix !== undefined) {
    next.last_sha256_prefix = normalizeOptionalText(patch.sha256_prefix);
  }
  if (hasOwn(patch, "hash_type") && patch.hash_type !== undefined) {
    next.hash_type = toText(patch.hash_type) === "real" ? "real" : "derived";
  }
  if (hasOwn(patch, "product_name") && patch.product_name !== undefined) {
    next.product_name = normalizeOptionalText(patch.product_name);
  }
  if (hasOwn(patch, "productName") && patch.productName !== undefined) {
    next.product_name = normalizeOptionalText(patch.productName);
  }
  if (hasOwn(patch, "publisher") && patch.publisher !== undefined) {
    next.publisher = normalizeOptionalText(patch.publisher);
  }
  if (hasOwn(patch, "company_name") && patch.company_name !== undefined) {
    next.company_name = normalizeOptionalText(patch.company_name);
  }
  if (hasOwn(patch, "signing_status") && patch.signing_status !== undefined) {
    next.signing_status = normalizeOptionalText(patch.signing_status);
  }
  if (hasOwn(patch, "signer_name") && patch.signer_name !== undefined) {
    next.signer_name = normalizeOptionalText(patch.signer_name);
  }
  if (hasOwn(patch, "file_version") && patch.file_version !== undefined) {
    next.file_version = normalizeOptionalText(patch.file_version);
  }
  if (hasOwn(patch, "original_filename") && patch.original_filename !== undefined) {
    next.original_filename = normalizeOptionalText(patch.original_filename);
  }
  if (hasOwn(patch, "command_line") && patch.command_line !== undefined) {
    next.command_line = normalizeOptionalText(patch.command_line);
  }
  if (hasOwn(patch, "username") && patch.username !== undefined) {
    next.username = normalizeOptionalText(patch.username);
  }
  if (hasOwn(patch, "source_confidence") && patch.source_confidence !== undefined) {
    next.source_confidence = clampConfidence(patch.source_confidence);
  }
  if (hasOwn(patch, "identity_confidence") && patch.identity_confidence !== undefined) {
    next.identity_confidence = clampConfidence(patch.identity_confidence);
  }
  if (hasOwn(patch, "summary_confidence") && patch.summary_confidence !== undefined) {
    next.summary_confidence = clampConfidence(patch.summary_confidence);
  }
  if (hasOwn(patch, "identity_status") && patch.identity_status !== undefined) {
    next.identity_status = normalizeOptionalText(patch.identity_status);
  }
  if (hasOwn(patch, "unresolved_reason") && patch.unresolved_reason !== undefined) {
    next.unresolved_reason = normalizeOptionalText(patch.unresolved_reason);
  }
  if (hasOwn(patch, "special_classification") && patch.special_classification !== undefined) {
    next.special_classification = normalizeOptionalText(patch.special_classification);
  }
  if (hasOwn(patch, "evidence_fields_present") && patch.evidence_fields_present !== undefined) {
    next.evidence_fields_present = patch.evidence_fields_present && typeof patch.evidence_fields_present === "object"
      ? patch.evidence_fields_present
      : null;
  }
  if (hasOwn(patch, "evidence_sources") && patch.evidence_sources !== undefined) {
    next.evidence_sources = Array.isArray(patch.evidence_sources)
      ? patch.evidence_sources.slice(0, 20)
      : [];
  }
  if (hasOwn(patch, "source_breakdown") && patch.source_breakdown !== undefined) {
    next.source_breakdown = patch.source_breakdown && typeof patch.source_breakdown === "object"
      ? patch.source_breakdown
      : null;
  }
  if (hasOwn(patch, "enrichment_attempts") && patch.enrichment_attempts !== undefined) {
    next.enrichment_attempts = Math.max(0, Math.floor(Number(patch.enrichment_attempts) || 0));
  }
  if (hasOwn(patch, "last_successful_enrichment") && patch.last_successful_enrichment !== undefined) {
    next.last_successful_enrichment = normalizeIso(patch.last_successful_enrichment);
  }
  if (hasOwn(patch, "last_failed_enrichment") && patch.last_failed_enrichment !== undefined) {
    next.last_failed_enrichment = normalizeIso(patch.last_failed_enrichment);
  }
  if (hasOwn(patch, "evidence_history") && patch.evidence_history !== undefined) {
    next.evidence_history = Array.isArray(patch.evidence_history)
      ? patch.evidence_history.slice(-10)
      : [];
  }
  if (hasOwn(patch, "publisher_slug") && patch.publisher_slug !== undefined) {
    next.publisher_slug = toText(patch.publisher_slug) || "unknown";
  }
  if (hasOwn(patch, "enrichment_query") && patch.enrichment_query !== undefined) {
    next.enrichment_query = normalizeOptionalText(patch.enrichment_query);
  }
  if (hasOwn(patch, "confidence") && patch.confidence !== undefined) {
    next.confidence = clampConfidence(patch.confidence);
  }
  if (hasOwn(patch, "stale") && patch.stale !== undefined) {
    next.stale = Boolean(patch.stale);
  }

  return next;
}

function getPaths() {
  return getProcessKnowledgePaths();
}

function getSeenRegistryInternal() {
  return readJsonCached(getPaths().seenRegistryPath, {}, seenRegistryCache) || {};
}

function getPendingQueueInternal() {
  return readJsonCached(getPaths().pendingEnrichmentPath, [], pendingQueueCache) || [];
}

function setSeenRegistryInternal(data) {
  const paths = getPaths();
  return writeJsonAtomic(paths.seenRegistryPath, data || {}, seenRegistryCache);
}

function setPendingQueueInternal(data) {
  const paths = getPaths();
  return writeJsonAtomic(paths.pendingEnrichmentPath, Array.isArray(data) ? data : [], pendingQueueCache);
}

function normalizeQueueEntry(entry = {}, fallbackIndex = 0) {
  const item = entry && typeof entry === "object" ? entry : {};
  return {
    key: toText(item.key || item.identity_key || ""),
    priority: Math.max(0, Math.floor(Number(item.priority) || 0)),
    queued_at: normalizeIso(item.queued_at) || new Date().toISOString(),
    reason: toText(item.reason || "manual") || "manual",
    _index: fallbackIndex,
  };
}

function sortQueueForDequeue(queue) {
  return [...queue].sort((left, right) => {
    const priorityDelta = Number(right.priority || 0) - Number(left.priority || 0);
    if (priorityDelta !== 0) return priorityDelta;
    const leftTime = Date.parse(left.queued_at || "") || 0;
    const rightTime = Date.parse(right.queued_at || "") || 0;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return Number(left._index || 0) - Number(right._index || 0);
  });
}

export function clearProcessKnowledgeRegistryCache() {
  seenRegistryCache = { mtime: 0, data: null };
  pendingQueueCache = { mtime: 0, data: null };
}

export function loadSeenRegistry() {
  return cloneJson(getSeenRegistryInternal()) || {};
}

export function loadPendingEnrichmentQueue() {
  const queue = getPendingQueueInternal().map((entry, index) => normalizeQueueEntry(entry, index));
  return cloneJson(queue.map(({ _index, ...entry }) => entry)) || [];
}

export function saveSeenRegistry(registry = loadSeenRegistry()) {
  return setSeenRegistryInternal(registry || {});
}

export function savePendingEnrichmentQueue(queue = loadPendingEnrichmentQueue()) {
  const normalized = Array.isArray(queue)
    ? queue.map((entry, index) => normalizeQueueEntry(entry, index)).map(({ _index, ...entry }) => entry)
    : [];
  return setPendingQueueInternal(normalized);
}

export function upsertRegistryEntry(identityKey, patch = {}) {
  const key = toText(identityKey || patch.identity_key || "");
  if (!key) {
    throw new Error("identityKey is required");
  }
  const registry = loadSeenRegistry();
  const existing = registry[key] || {};
  const now = new Date().toISOString();
  const merged = {
    identity_key: key,
    image_name: "unknown",
    status: "pending",
    first_seen: now,
    last_seen: now,
    last_enriched: null,
    failure_count: 0,
    next_retry_at: null,
    md_file: null,
    last_path: null,
    last_signer: null,
    last_version: null,
    last_sha256_prefix: null,
    last_sha256: null,
    hash_type: "derived",
    product_name: null,
    publisher: null,
    company_name: null,
    signing_status: null,
    signer_name: null,
    file_version: null,
    original_filename: null,
    command_line: null,
    username: null,
    publisher_slug: "unknown",
    enrichment_query: null,
    confidence: 0,
    source_confidence: 0,
    identity_confidence: 0,
    summary_confidence: 0,
    identity_status: "unresolved",
    unresolved_reason: null,
    special_classification: null,
    evidence_fields_present: null,
    evidence_sources: [],
    source_breakdown: null,
    enrichment_attempts: 0,
    last_successful_enrichment: null,
    last_failed_enrichment: null,
    evidence_history: [],
    stale: false,
    ...existing,
  };
  const normalizedPatch = normalizeRegistryPatch(patch);
  for (const [field, value] of Object.entries(normalizedPatch)) {
    merged[field] = value;
  }
  merged.identity_key = key;
  merged.image_name = toText(merged.image_name) || "unknown";
  merged.status = normalizeStatus(merged.status);
  merged.first_seen = normalizeIso(merged.first_seen) || now;
  merged.last_seen = normalizeIso(merged.last_seen) || now;
  merged.last_enriched = normalizeIso(merged.last_enriched);
  merged.failure_count = Math.max(0, Math.floor(Number(merged.failure_count) || 0));
  merged.next_retry_at = normalizeIso(merged.next_retry_at);
  merged.md_file = normalizeOptionalText(merged.md_file);
  merged.last_path = merged.last_path ? sanitizePath(merged.last_path) : null;
  merged.last_signer = normalizeOptionalText(merged.last_signer);
  merged.last_version = normalizeOptionalText(merged.last_version);
  merged.last_sha256_prefix = normalizeOptionalText(merged.last_sha256_prefix);
  merged.last_sha256 = normalizeOptionalText(merged.last_sha256);
  merged.hash_type = toText(merged.hash_type) === "real" ? "real" : "derived";
  merged.product_name = normalizeOptionalText(merged.product_name);
  merged.publisher = normalizeOptionalText(merged.publisher);
  merged.company_name = normalizeOptionalText(merged.company_name);
  merged.signing_status = normalizeOptionalText(merged.signing_status);
  merged.signer_name = normalizeOptionalText(merged.signer_name);
  merged.file_version = normalizeOptionalText(merged.file_version);
  merged.original_filename = normalizeOptionalText(merged.original_filename);
  merged.command_line = normalizeOptionalText(merged.command_line);
  merged.username = normalizeOptionalText(merged.username);
  merged.publisher_slug = toText(merged.publisher_slug) || "unknown";
  merged.enrichment_query = normalizeOptionalText(merged.enrichment_query);
  merged.confidence = clampConfidence(merged.confidence);
  merged.source_confidence = clampConfidence(merged.source_confidence);
  merged.identity_confidence = clampConfidence(merged.identity_confidence);
  merged.summary_confidence = clampConfidence(merged.summary_confidence);
  merged.identity_status = normalizeOptionalText(merged.identity_status) || "unresolved";
  merged.unresolved_reason = normalizeOptionalText(merged.unresolved_reason);
  merged.special_classification = normalizeOptionalText(merged.special_classification);
  merged.evidence_fields_present = merged.evidence_fields_present && typeof merged.evidence_fields_present === "object"
    ? merged.evidence_fields_present
    : null;
  merged.evidence_sources = Array.isArray(merged.evidence_sources) ? merged.evidence_sources.slice(0, 20) : [];
  merged.source_breakdown = merged.source_breakdown && typeof merged.source_breakdown === "object"
    ? merged.source_breakdown
    : null;
  merged.enrichment_attempts = Math.max(0, Math.floor(Number(merged.enrichment_attempts) || 0));
  merged.last_successful_enrichment = normalizeIso(merged.last_successful_enrichment);
  merged.last_failed_enrichment = normalizeIso(merged.last_failed_enrichment);
  merged.evidence_history = Array.isArray(merged.evidence_history) ? merged.evidence_history.slice(-10) : [];
  merged.stale = Boolean(merged.stale);

  const nextRegistry = {
    ...registry,
    [key]: merged,
  };
  const writeResult = saveSeenRegistry(nextRegistry);
  if (writeResult?.locked) return null;
  return cloneJson(merged);
}

export function transitionRegistryStatus(identityKey, status, patch = {}) {
  return upsertRegistryEntry(identityKey, { ...patch, status });
}

export function markRegistryQueued(identityKey, patch = {}) {
  return transitionRegistryStatus(identityKey, "queued", patch);
}

export function markRegistryEnriching(identityKey, patch = {}) {
  return transitionRegistryStatus(identityKey, "enriching", patch);
}

export function markRegistryKnown(identityKey, patch = {}) {
  return transitionRegistryStatus(identityKey, "known", {
    ...patch,
    failure_count: 0,
    next_retry_at: null,
    stale: false,
  });
}

export function markRegistryIgnored(identityKey, patch = {}) {
  return transitionRegistryStatus(identityKey, "ignored", {
    ...patch,
    next_retry_at: null,
    stale: false,
  });
}

export function markRegistrySuspicious(identityKey, patch = {}) {
  return transitionRegistryStatus(identityKey, "suspicious", {
    ...patch,
    stale: false,
  });
}

export function markRegistryFailed(identityKey, patch = {}) {
  const current = loadSeenRegistry()[toText(identityKey)] || {};
  const nextFailureCount = hasOwn(patch, "failure_count") && patch.failure_count !== undefined
    ? Math.max(0, Math.floor(Number(patch.failure_count) || 0))
    : Math.max(0, Math.floor(Number(current.failure_count || 0) + 1));
  const nextRetryAt = computeNextRetryAt(nextFailureCount);
  return transitionRegistryStatus(identityKey, "failed", {
    ...patch,
    failure_count: nextFailureCount,
    next_retry_at: nextRetryAt,
    stale: true,
  });
}

export function resetRegistryEntry(identityKey, patch = {}) {
  return transitionRegistryStatus(identityKey, "pending", {
    ...patch,
    failure_count: 0,
    next_retry_at: null,
    stale: false,
  });
}

export function computeNextRetryAt(failureCount, referenceTime = new Date()) {
  const count = Math.max(0, Math.floor(Number(failureCount) || 0));
  if (count >= nextRetryScheduleMs.length) return null;
  const baseTime = referenceTime instanceof Date ? referenceTime.getTime() : Date.parse(referenceTime);
  const now = Number.isFinite(baseTime) ? baseTime : Date.now();
  return new Date(now + nextRetryScheduleMs[count]).toISOString();
}

export function enqueue(key, priority = 1, reason = "manual") {
  const identityKey = toText(key);
  if (!identityKey) {
    throw new Error("queue key is required");
  }
  const queue = loadPendingEnrichmentQueue();
  const existingIndex = queue.findIndex((entry) => toText(entry.key) === identityKey);
  const nextPriority = Math.max(0, Math.floor(Number(priority) || 0));
  if (existingIndex >= 0) {
    if (nextPriority > Number(queue[existingIndex].priority || 0)) {
      queue[existingIndex] = {
        ...queue[existingIndex],
        priority: nextPriority,
        reason: toText(reason) || queue[existingIndex].reason || "manual",
      };
      const result = savePendingEnrichmentQueue(queue);
      const { _index, ...item } = queue[existingIndex];
      return result?.locked ? null : cloneJson(item);
    }
    const { _index, ...item } = queue[existingIndex];
    return cloneJson(item);
  }
  const item = {
    key: identityKey,
    priority: nextPriority,
    queued_at: new Date().toISOString(),
    reason: toText(reason) || "manual",
  };
  queue.push(item);
  const result = savePendingEnrichmentQueue(queue);
  return result?.locked ? null : cloneJson(item);
}

export function dequeue() {
  const queue = loadPendingEnrichmentQueue();
  if (!queue.length) return null;
  const normalized = queue.map((entry, index) => normalizeQueueEntry(entry, index));
  const sorted = sortQueueForDequeue(normalized);
  const selected = sorted[0];
  if (!selected) return null;
  const selectedIndex = normalized.findIndex((entry) => entry._index === selected._index);
  const nextQueue = normalized
    .filter((entry, index) => index !== (selectedIndex >= 0 ? selectedIndex : normalized.indexOf(selected)))
    .map(({ _index, ...entry }) => entry);
  const result = savePendingEnrichmentQueue(nextQueue);
  if (result?.locked) return null;
  const { _index, ...dequeued } = selected;
  return cloneJson(dequeued);
}

export function removePendingEnrichmentEntry(identityKey) {
  const key = toText(identityKey);
  if (!key) {
    return false;
  }

  const queue = loadPendingEnrichmentQueue();
  const nextQueue = queue.filter((entry) => toText(entry.key) !== key);
  if (nextQueue.length === queue.length) {
    return false;
  }

  const result = savePendingEnrichmentQueue(nextQueue);
  return !result?.locked;
}

export function peekPendingEnrichmentQueue() {
  const normalized = loadPendingEnrichmentQueue().map((entry, index) => normalizeQueueEntry(entry, index));
  return cloneJson(sortQueueForDequeue(normalized).map(({ _index, ...entry }) => entry)) || [];
}

export function recordRegistryObservation(identity, patch = {}) {
  const key = toText(identity?.identity_key ?? identity?.key ?? "");
  if (!key) {
    throw new Error("identity.key is required");
  }
  return upsertRegistryEntry(key, {
    ...identity,
    ...patch,
    last_seen: patch.last_seen ?? new Date().toISOString(),
  });
}

export function loadProcessKnowledgeState() {
  const paths = getPaths();
  const registry = loadSeenRegistry();
  const decoratedRegistry = Object.fromEntries(
    Object.entries(registry).map(([identityKey, entry]) => [
      identityKey,
      {
        ...entry,
        md_path: entry?.md_file ? path.join(paths.brainRoot, String(entry.md_file)) : null,
      },
    ])
  );

  return {
    registry: decoratedRegistry,
    pending: loadPendingEnrichmentQueue(),
    paths: {
      brainRoot: paths.brainRoot,
      processKnowledgeRoot: paths.processKnowledgeRoot,
    },
  };
}

export { REGISTRY_STATUSES };
