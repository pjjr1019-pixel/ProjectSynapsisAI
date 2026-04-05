import fs from "node:fs";
import path from "node:path";

import {
  ensureDir,
  firstParagraph,
  normalizeSlashes,
  uniqueSorted,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { fetchWebContext } from "./brain-web-context.mjs";
import { collectLocalEvidence } from "./process-knowledge-local-evidence.mjs";
import { evaluateRepairNeed } from "./process-knowledge-pipeline.mjs";
import {
  buildEvidenceQuery,
  classifySpecialProcess,
  decidePipelineVerdict,
  detectConflictingFindings,
  normalizeEvidenceFieldFlags,
  scoreSourceConfidence,
  shouldPersistFinalKnowledge,
} from "./process-knowledge-pipeline.mjs";
import { getLatestTelemetry } from "./optimizer-telemetry.mjs";
import {
  enqueue,
  loadPendingEnrichmentQueue,
  loadSeenRegistry,
  markRegistryEnriching,
  markRegistryFailed,
  peekPendingEnrichmentQueue,
  removePendingEnrichmentEntry,
  upsertRegistryEntry,
} from "./process-knowledge-registry.mjs";
import { getProcessKnowledgeMarkdownPath } from "./process-knowledge-identity.mjs";
import { getProcessKnowledgePaths } from "./process-knowledge-paths.mjs";

const BASE_INTERVAL_MS = 12_000;
const IDLE_INTERVAL_MS = 60_000;
const PRESSURE_INTERVAL_MS = 45_000;
const MAX_SEARCH_RESULTS = 5;
const MAX_WEB_CONTEXT_CHARS = 5_500;
const MAX_QUEUE_SCAN = 10;
const REPAIR_SCAN_LIMIT = 40;

const paths = getProcessKnowledgePaths();

let isRunning = false;
let loopTimerId = null;
let logger = console;
let currentIntervalMs = BASE_INTERVAL_MS;
let tickCount = 0;
let lastTickSnapshot = createIdleSnapshot();

function createIdleSnapshot() {
  return {
    startedAt: null,
    completedAt: null,
    status: "idle",
    reason: "not_started",
    processedCount: 0,
    knownCount: 0,
    suspiciousCount: 0,
    failedCount: 0,
    skippedCount: 0,
    queueDepth: 0,
    eligibleCount: 0,
    intervalMs: BASE_INTERVAL_MS,
    pressure: "unknown",
    lastIdentityKey: null,
    lastMarkdownFile: null,
    lastQuery: null,
    lastProvider: null,
    lastError: null,
    lastVerdict: null,
  };
}

function safeLog(level, message, details) {
  const sink = logger && typeof logger[level] === "function" ? logger[level] : logger?.log;
  if (typeof sink !== "function") return;
  if (details === undefined) {
    sink.call(logger, message);
    return;
  }
  sink.call(logger, message, details);
}

function toText(value) {
  return String(value ?? "").trim();
}

function compactText(value, maxLength = 160) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}...`;
}

function normalizeKey(value) {
  return toText(value).toLowerCase();
}

function isHighPressureTelemetry(telemetry) {
  const overall = String(telemetry?.pressure?.overall || "").toLowerCase();
  return overall === "high" || overall === "critical";
}

function displayNameForEntry(entry) {
  return toText(entry?.product_name || entry?.display_name || entry?.image_name || entry?.identity_key || "unknown");
}

function normalizeMarkdownPath(markdownPath) {
  return normalizeSlashes(path.relative(paths.brainRoot, markdownPath));
}

function buildEvidenceLines(webResult, scoredSources) {
  const sources = Array.isArray(scoredSources?.sources)
    ? scoredSources.sources
    : Array.isArray(webResult?.sources)
      ? webResult.sources
      : [];

  const seen = new Set();
  const lines = [];
  for (const source of sources) {
    const title = compactText(source?.title || "Result", 140);
    const url = compactText(source?.url || "", 320);
    const trust = toText(source?.trust || "");
    const key = `${title}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({ title, url, trust });
  }
  return lines;
}

function buildLocalEvidenceLines(evidence = {}) {
  const lines = [];
  const push = (label, value) => {
    const text = compactText(value, 220);
    if (text) lines.push(`- ${label}: ${text}`);
  };

  push("PID", evidence.pid);
  push("Parent PID", evidence.parent_pid);
  push("Sample PIDs", Array.isArray(evidence.sample_pids) ? evidence.sample_pids.join(", ") : null);
  push("Image name", evidence.image_name);
  push("Executable path", evidence.executable_path);
  push("Command line", evidence.command_line);
  push("Username", evidence.username);
  push("CPU snapshot", Number.isFinite(Number(evidence.cpu_snapshot)) ? `${Number(evidence.cpu_snapshot).toFixed(1)}%` : null);
  push("Memory snapshot", Number.isFinite(Number(evidence.memory_snapshot)) ? `${Math.max(0, Number(evidence.memory_snapshot))} bytes` : null);
  push("Company name", evidence.company_name);
  push("Product name", evidence.product_name);
  push("File version", evidence.file_version);
  push("Original filename", evidence.original_filename);
  push("Signing status", evidence.signing_status);
  push("Signer name", evidence.signer_name);
  push("SHA-256", evidence.sha256);
  push("Hosted services", Array.isArray(evidence.hosted_services) ? evidence.hosted_services.join(", ") : null);
  push("Runtime target", evidence.runtime_target);

  return lines;
}

function buildMarkdownDocument({
  entry,
  query,
  webResult,
  verdict,
  evidence,
  specialClassification,
  sourceScore,
  conflicts,
  generatedAt,
  summary,
}) {
  const title = displayNameForEntry(entry);
  const evidenceLines = buildEvidenceLines(webResult, sourceScore);
  const webText = String(webResult?.text || "").trim();
  const sources = evidenceLines.length
    ? evidenceLines.map((source) => `- [${source.title}](${source.url || "#"})${source.trust ? ` [${source.trust}]` : ""}`).join("\n")
    : "- None";
  const localEvidence = buildLocalEvidenceLines(evidence).join("\n") || "- None";
  const specialNotes = (Array.isArray(specialClassification?.notes) ? specialClassification.notes : []).map((note) => `- ${note}`).join("\n") || "- None";
  const conflictNotes = Array.isArray(conflicts) && conflicts.length ? conflicts.map((conflict) => `- ${conflict}`).join("\n") : "- None";

  const frontMatter = [
    "---",
    `identity_status: ${verdict.status}`,
    `identity_confidence: ${Number(verdict.identityConfidence || 0)}`,
    `source_confidence: ${Number(verdict.sourceConfidence || 0)}`,
    `summary_confidence: ${Number(verdict.summaryConfidence || 0)}`,
    `unresolved_reason: ${verdict.unresolvedReason || ""}`,
    `enrichment_attempts: ${Math.max(1, Number(entry.enrichment_attempts || 0))}`,
    `last_successful_enrichment: ${generatedAt}`,
    `last_failed_enrichment: ${entry.last_failed_enrichment || ""}`,
    `evidence_sources: ${evidenceLines.length}`,
    `special_classifier: ${specialClassification.className || "standard"}`,
    `evidence_fields_present: ${JSON.stringify(normalizeEvidenceFieldFlags(evidence))}`,
    "---",
  ].join("\n");

  return [
    frontMatter,
    `# ${title}`,
    "",
    "## AI Summary",
    summary,
    "",
    "## What it does",
    `This identity was resolved using local executable evidence first, then trusted external references when available. Query used: ${query || "(none)"}.`,
    "",
    "## Local Identity Evidence",
    localEvidence,
    "",
    "## Special Classification Notes",
    `- Class: ${specialClassification.className || "standard"}`,
    specialNotes,
    "",
    "## Trusted Source Findings",
    `- Source confidence level: ${sourceScore.level || "none"}`,
    `- High trust: ${Number(sourceScore.high || 0)}, Medium trust: ${Number(sourceScore.medium || 0)}, Low trust: ${Number(sourceScore.low || 0)}`,
    webText || "No web snippet text was available.",
    "",
    "## Low-Confidence / Conflicting Findings",
    conflictNotes,
    "",
    "## Verdict",
    `- Status: ${verdict.status}`,
    `- Identity confidence: ${Number(verdict.identityConfidence || 0)}`,
    `- Source confidence: ${Number(verdict.sourceConfidence || 0)}`,
    `- Summary confidence: ${Number(verdict.summaryConfidence || 0)}`,
    `- Unresolved reason: ${verdict.unresolvedReason || "none"}`,
    "",
    "## Refresh / Retry Policy",
    "- Re-enrich when hash, signer, product version, or executable path changes.",
    "- Re-enrich when source confidence drops below medium or when conflicts are detected.",
    "- Keep unresolved identities in pending state until required local evidence is collected.",
    "",
    "## Evidence Sources",
    sources,
  ].join("\n");
}

function extractSummaryFromMarkdown(markdownText) {
  const text = String(markdownText || "").replace(/\r\n/g, "\n");
  if (!text.trim()) return "";

  const lines = text.split("\n");
  let capture = false;
  const paragraphs = [];
  let current = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+AI Summary$/i.test(trimmed) || /^##\s+Summary$/i.test(trimmed)) {
      capture = true;
      current = [];
      continue;
    }
    if (capture && /^##\s+/.test(trimmed)) {
      break;
    }
    if (!capture) continue;
    if (!trimmed) {
      if (current.length) {
        paragraphs.push(current.join(" ").trim());
        current = [];
      }
      continue;
    }
    if (/^#/.test(trimmed)) continue;
    current.push(trimmed.replace(/^[-*]\s+/, ""));
  }

  if (current.length) paragraphs.push(current.join(" ").trim());
  if (paragraphs.length) return paragraphs[0];

  return firstParagraph(text) || "";
}

function buildSearchTokens(...parts) {
  const tokens = [];
  for (const part of parts) {
    for (const token of String(part ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/g)) {
      if (token.length >= 2) tokens.push(token);
    }
  }
  return uniqueSorted(tokens).slice(0, 120);
}

function buildLookupEntry(entry, summary, markdownPath) {
  const searchTerms = buildSearchTokens(
    entry?.identity_key,
    entry?.image_name,
    entry?.publisher,
    entry?.publisher_slug,
    entry?.product_name,
    entry?.last_signer,
    entry?.last_version,
    entry?.last_sha256_prefix,
    entry?.last_path,
    entry?.special_classification,
    entry?.unresolved_reason,
    summary
  );

  return {
    identity_key: entry?.identity_key || "",
    image_name: entry?.image_name || "unknown",
    status: entry?.status || "pending",
    first_seen: entry?.first_seen || null,
    last_seen: entry?.last_seen || null,
    last_enriched: entry?.last_enriched || null,
    last_successful_enrichment: entry?.last_successful_enrichment || null,
    last_failed_enrichment: entry?.last_failed_enrichment || null,
    enrichment_attempts: Number(entry?.enrichment_attempts || 0),
    failure_count: Number(entry?.failure_count || 0),
    next_retry_at: entry?.next_retry_at || null,
    md_file: entry?.md_file || (markdownPath ? normalizeMarkdownPath(markdownPath) : null),
    last_path: entry?.last_path || null,
    last_signer: entry?.last_signer || null,
    last_version: entry?.last_version || null,
    last_sha256_prefix: entry?.last_sha256_prefix || null,
    last_sha256: entry?.last_sha256 || null,
    hash_type: entry?.hash_type || "derived",
    product_name: entry?.product_name || null,
    publisher: entry?.publisher || null,
    publisher_slug: entry?.publisher_slug || "unknown",
    enrichment_query: entry?.enrichment_query || null,
    confidence: Number(entry?.confidence || 0),
    source_confidence: Number(entry?.source_confidence || 0),
    identity_confidence: Number(entry?.identity_confidence || 0),
    summary_confidence: Number(entry?.summary_confidence || 0),
    identity_status: entry?.identity_status || null,
    unresolved_reason: entry?.unresolved_reason || null,
    special_classification: entry?.special_classification || null,
    evidence_fields_present: entry?.evidence_fields_present || null,
    stale: Boolean(entry?.stale),
    title: displayNameForEntry(entry),
    summary,
    search_terms: searchTerms,
  };
}

function buildSearchDocument(entry, summary, markdownPath) {
  const lookupEntry = buildLookupEntry(entry, summary, markdownPath);
  return {
    identity_key: lookupEntry.identity_key,
    title: lookupEntry.title,
    status: lookupEntry.status,
    md_file: lookupEntry.md_file,
    confidence: lookupEntry.confidence,
    source_confidence: lookupEntry.source_confidence,
    identity_confidence: lookupEntry.identity_confidence,
    summary_confidence: lookupEntry.summary_confidence,
    unresolved_reason: lookupEntry.unresolved_reason,
    special_classification: lookupEntry.special_classification,
    last_seen: lookupEntry.last_seen,
    last_enriched: lookupEntry.last_enriched,
    summary: lookupEntry.summary,
    search_terms: lookupEntry.search_terms,
  };
}

function compareByRecency(left, right) {
  const leftTime = Date.parse(left?.last_enriched || left?.last_seen || "") || 0;
  const rightTime = Date.parse(right?.last_enriched || right?.last_seen || "") || 0;
  if (rightTime !== leftTime) return rightTime - leftTime;
  return String(left?.image_name || "").localeCompare(String(right?.image_name || ""));
}

function writeStableText(filePath, value) {
  ensureDir(path.dirname(filePath));
  const next = `${String(value ?? "").replace(/\r\n/g, "\n")}\n`;
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (prev === next) {
    return { changed: false, bytes: Buffer.byteLength(next, "utf8") };
  }
  fs.writeFileSync(filePath, next, "utf8");
  return { changed: true, bytes: Buffer.byteLength(next, "utf8") };
}

function buildIndexMarkdown(lookupEntries, countsByStatus, queueDepth, generatedAt) {
  const lines = [];
  lines.push("# Process Knowledge Index");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Total entries: ${lookupEntries.length}`);
  lines.push(`Pending queue items: ${queueDepth}`);
  lines.push("");
  lines.push("## Status Counts");
  for (const [status, count] of Object.entries(countsByStatus).sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push("");
  lines.push("## Entries");
  for (const entry of lookupEntries) {
    const linkTarget = entry.md_file ? path.basename(entry.md_file) : "";
    const link = linkTarget ? `[${linkTarget}](${linkTarget})` : entry.identity_key;
    const status = entry.status || "pending";
    const confidence = Number.isFinite(Number(entry.summary_confidence)) ? Number(entry.summary_confidence) : 0;
    const summary = compactText(entry.summary || "No summary available.", 180);
    lines.push(`- ${link} - ${displayNameForEntry(entry)} (${status}, ${confidence}%)`);
    lines.push(`  - ${summary}`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildIndexes(registry, queue, generatedAt, lastSummaryByKey = new Map()) {
  const entries = Object.values(registry || {}).sort(compareByRecency);
  const lookupEntries = [];
  const countsByStatus = {};

  for (const entry of entries) {
    const markdownPath = entry?.md_file
      ? path.join(paths.brainRoot, String(entry.md_file))
      : null;
    let summary = lastSummaryByKey.get(entry.identity_key) || "";
    if (!summary && markdownPath && fs.existsSync(markdownPath)) {
      try {
        summary = extractSummaryFromMarkdown(fs.readFileSync(markdownPath, "utf8"));
      } catch {
        summary = "";
      }
    }
    if (!summary) {
      summary = `${displayNameForEntry(entry)} is tracked with status ${entry?.status || "pending"}.`;
    }

    const lookupEntry = buildLookupEntry(entry, summary, markdownPath);
    lookupEntries.push(lookupEntry);
    countsByStatus[lookupEntry.status] = (countsByStatus[lookupEntry.status] || 0) + 1;
  }

  const lookupPayload = {
    generated_at: generatedAt,
    total_count: lookupEntries.length,
    queue_depth: Array.isArray(queue) ? queue.length : 0,
    counts_by_status: countsByStatus,
    entries: lookupEntries,
    by_identity_key: Object.fromEntries(lookupEntries.map((entry) => [entry.identity_key, entry])),
  };

  const searchPayload = {
    generated_at: generatedAt,
    total_count: lookupEntries.length,
    queue_depth: Array.isArray(queue) ? queue.length : 0,
    documents: lookupEntries.map((entry) =>
      buildSearchDocument(entry, entry.summary, entry.md_file ? path.join(paths.brainRoot, entry.md_file) : null)
    ),
  };

  const indexMarkdown = buildIndexMarkdown(lookupEntries, countsByStatus, Array.isArray(queue) ? queue.length : 0, generatedAt);

  return {
    lookupPayload,
    searchPayload,
    indexMarkdown,
  };
}

function buildProcessSummary(evidence, verdict, specialClassification, sourceScore) {
  const product = toText(evidence.product_name || evidence.image_name || "process");
  const classLabel = specialClassification?.className || "standard";
  const trust = sourceScore?.level || "none";
  if (verdict.status === "resolved_high_confidence") {
    return `${product} was identified with high confidence from local executable evidence; classification=${classLabel}, trusted_source_level=${trust}.`;
  }
  if (verdict.status === "resolved_medium_confidence") {
    return `${product} was identified with medium confidence from local executable evidence; classification=${classLabel}, trusted_source_level=${trust}.`;
  }
  return `${product} could not be resolved confidently yet. It remains in ${verdict.status} state.`;
}

function writeMarkdownEntry(entry, generatedAt, webResult, verdict, evidence, specialClassification, sourceScore, conflicts, query) {
  const markdownPath = getProcessKnowledgeMarkdownPath(entry);
  const markdownFile = normalizeMarkdownPath(markdownPath);
  const summary = buildProcessSummary(evidence, verdict, specialClassification, sourceScore);
  const markdown = buildMarkdownDocument({
    entry: {
      ...entry,
      md_file: markdownFile,
    },
    query,
    webResult,
    verdict,
    evidence,
    specialClassification,
    sourceScore,
    conflicts,
    generatedAt,
    summary,
  });
  writeStableText(markdownPath, markdown);
  return { markdownPath, markdownFile, markdown, summary };
}

function selectNextQueueItem(queue, registry, nowMs) {
  for (const item of queue.slice(0, MAX_QUEUE_SCAN)) {
    const key = normalizeKey(item?.key);
    if (!key) continue;
    const entry = registry[key] || registry[item.key] || null;
    if (!entry) {
      return { queueItem: item, registryEntry: null, reason: "missing_registry" };
    }

    const status = String(entry.status || "pending").toLowerCase();
    if (status === "ignored") {
      return { queueItem: item, registryEntry: entry, reason: "ignored" };
    }
    if (status === "failed" && entry.next_retry_at) {
      const retryAt = Date.parse(entry.next_retry_at);
      if (Number.isFinite(retryAt) && retryAt > nowMs) {
        continue;
      }
    }
    return { queueItem: item, registryEntry: entry, reason: "eligible" };
  }
  return { queueItem: null, registryEntry: null, reason: queue.length ? "retry_pending" : "empty" };
}

function registerRepairCandidates(registry = {}, queue = []) {
  const queuedKeys = new Set((Array.isArray(queue) ? queue : []).map((item) => toText(item?.key)).filter(Boolean));
  let count = 0;
  for (const entry of Object.values(registry || {}).slice(0, REPAIR_SCAN_LIMIT)) {
    if (!entry?.identity_key) continue;
    const repair = evaluateRepairNeed(entry);
    if (!repair.needsRepair) continue;
    if (queuedKeys.has(entry.identity_key)) continue;
    enqueue(entry.identity_key, 6, "repair_weak_entry");
    upsertRegistryEntry(entry.identity_key, {
      status: "pending",
      unresolved_reason: repair.reasons.join(","),
      stale: true,
    });
    count += 1;
  }
  return count;
}

async function processEnrichmentCandidate(candidate, nowIso, lastSummaryByKey) {
  const entry = candidate.registryEntry || {};
  const identityKey = toText(candidate.queueItem?.key || entry.identity_key);

  markRegistryEnriching(identityKey, {
    last_seen: nowIso,
    enrichment_attempts: Math.max(1, Number(entry.enrichment_attempts || 0) + 1),
  });

  const localEvidence = collectLocalEvidence(entry);
  const evidence = localEvidence.evidence || {};
  const processContext = {
    image_name: evidence.image_name,
    command_line: evidence.command_line,
    parent_image_name: toText(localEvidence?.sampleRows?.[0]?.parentProcessName || ""),
    executable_path: evidence.executable_path,
  };

  const specialClassification = classifySpecialProcess(evidence, processContext);
  const query = buildEvidenceQuery(evidence);

  const webResult = query
    ? await fetchWebContext(query, {
        maxResults: MAX_SEARCH_RESULTS,
        maxChars: MAX_WEB_CONTEXT_CHARS,
      })
    : { ok: false, sources: [], text: "", error: "empty_query", provider: null };

  const sourceScore = scoreSourceConfidence(webResult?.sources || []);
  const conflicts = detectConflictingFindings({ evidence, sourceScore });
  const verdict = decidePipelineVerdict({
    evidence,
    sourceScore,
    conflicts,
    specialClassification,
  });

  let markdownFile = null;
  let markdownPath = null;
  let summary = buildProcessSummary(evidence, verdict, specialClassification, sourceScore);

  if (shouldPersistFinalKnowledge(verdict)) {
    const markdownWrite = writeMarkdownEntry(entry, nowIso, webResult, verdict, evidence, specialClassification, sourceScore, conflicts, query);
    markdownFile = markdownWrite.markdownFile;
    markdownPath = markdownWrite.markdownPath;
    summary = markdownWrite.summary;
    lastSummaryByKey.set(identityKey, summary);
  }

  const queueRemoved = removePendingEnrichmentEntry(identityKey);

  const nextStatus = shouldPersistFinalKnowledge(verdict) ? verdict.status : "pending";
  const unresolvedReason = shouldPersistFinalKnowledge(verdict)
    ? null
    : verdict.unresolvedReason || "insufficient_evidence";

  const patch = {
    status: nextStatus,
    last_seen: nowIso,
    last_enriched: nowIso,
    last_successful_enrichment: shouldPersistFinalKnowledge(verdict) ? nowIso : entry.last_successful_enrichment || null,
    last_failed_enrichment: shouldPersistFinalKnowledge(verdict) ? entry.last_failed_enrichment || null : nowIso,
    md_file: shouldPersistFinalKnowledge(verdict) ? markdownFile : null,
    enrichment_query: query || null,
    confidence: Number(verdict.summaryConfidence || 0),
    source_confidence: Number(verdict.sourceConfidence || 0),
    identity_confidence: Number(verdict.identityConfidence || 0),
    summary_confidence: Number(verdict.summaryConfidence || 0),
    identity_status: verdict.status,
    unresolved_reason: unresolvedReason,
    stale: !shouldPersistFinalKnowledge(verdict),
    last_path: evidence.executable_path || entry.last_path || null,
    last_signer: evidence.signer_name || entry.last_signer || null,
    signer_name: evidence.signer_name || entry.signer_name || null,
    signing_status: evidence.signing_status || entry.signing_status || null,
    last_version: evidence.file_version || entry.last_version || null,
    file_version: evidence.file_version || entry.file_version || null,
    original_filename: evidence.original_filename || entry.original_filename || null,
    command_line: evidence.command_line || entry.command_line || null,
    username: evidence.username || entry.username || null,
    last_sha256_prefix: evidence.sha256 ? String(evidence.sha256).slice(0, 12) : entry.last_sha256_prefix || null,
    last_sha256: evidence.sha256 || entry.last_sha256 || null,
    hash_type: evidence.sha256 ? "real" : entry.hash_type || "derived",
    product_name: evidence.product_name || entry.product_name || null,
    company_name: evidence.company_name || entry.company_name || null,
    publisher: evidence.company_name || entry.publisher || null,
    special_classification: specialClassification.className || "standard",
    evidence_fields_present: normalizeEvidenceFieldFlags(evidence),
    evidence_sources: Array.isArray(sourceScore.sources)
      ? sourceScore.sources.map((source) => ({
          title: source.title,
          url: source.url,
          host: source.host,
          trust: source.trust,
          score: source.score,
        })).slice(0, 20)
      : [],
    source_breakdown: {
      total: Number(sourceScore.total || 0),
      high: Number(sourceScore.high || 0),
      medium: Number(sourceScore.medium || 0),
      low: Number(sourceScore.low || 0),
      level: sourceScore.level || "none",
    },
    enrichment_attempts: Math.max(1, Number(entry.enrichment_attempts || 0) + 1),
    evidence_history: [
      ...(Array.isArray(entry.evidence_history) ? entry.evidence_history.slice(-8) : []),
      {
        at: nowIso,
        status: verdict.status,
        unresolved_reason: unresolvedReason,
        summary_confidence: Number(verdict.summaryConfidence || 0),
        source_confidence: Number(verdict.sourceConfidence || 0),
      },
    ],
  };

  upsertRegistryEntry(identityKey, patch);

  if (!shouldPersistFinalKnowledge(verdict)) {
    enqueue(identityKey, 5, "insufficient_evidence");
  }

  return {
    identityKey,
    status: verdict.status,
    persistedStatus: nextStatus,
    confidence: Number(verdict.summaryConfidence || 0),
    markdownFile,
    markdownPath,
    queueRemoved,
    webProvider: webResult?.provider || null,
    sourceCount: Array.isArray(webResult?.sources) ? webResult.sources.length : 0,
    query,
    summary,
    sourceScore,
    verdict,
  };
}

function scheduleNextTick(nextReason = "idle", queueDepth = 0, pressure = "unknown") {
  if (!isRunning) return;
  const highPressure = pressure === "high" || pressure === "critical";
  if (queueDepth === 0 || nextReason === "empty") {
    currentIntervalMs = IDLE_INTERVAL_MS;
  } else if (highPressure || nextReason === "pressure_skip") {
    currentIntervalMs = PRESSURE_INTERVAL_MS;
  } else {
    currentIntervalMs = BASE_INTERVAL_MS;
  }

  loopTimerId = setTimeout(async () => {
    try {
      await runTick();
    } catch (error) {
      lastTickSnapshot = {
        ...lastTickSnapshot,
        completedAt: new Date().toISOString(),
        status: "error",
        reason: String(error?.message || error),
        lastError: String(error?.message || error),
      };
      safeLog("error", "[process-knowledge] enricher tick error", error?.message || error);
    }
    scheduleNextTick(lastTickSnapshot.reason, lastTickSnapshot.queueDepth || 0, lastTickSnapshot.pressure || "unknown");
  }, currentIntervalMs);
}

async function runTick() {
  const startedAt = Date.now();
  tickCount += 1;
  const nowIso = new Date(startedAt).toISOString();
  const telemetry = getLatestTelemetry();
  const queue = peekPendingEnrichmentQueue();
  const registry = loadSeenRegistry();
  const pressure = String(telemetry?.pressure?.overall || "unknown");
  const repairQueued = registerRepairCandidates(registry, queue);

  lastTickSnapshot = {
    ...lastTickSnapshot,
    startedAt: nowIso,
    completedAt: null,
    status: "running",
    reason: "running",
    processedCount: 0,
    knownCount: 0,
    suspiciousCount: 0,
    failedCount: 0,
    skippedCount: 0,
    queueDepth: queue.length,
    eligibleCount: 0,
    intervalMs: currentIntervalMs,
    pressure,
    lastIdentityKey: null,
    lastMarkdownFile: null,
    lastQuery: null,
    lastProvider: null,
    lastError: null,
    lastVerdict: null,
  };

  if (seenRegistrySize(registry) === 0 && queue.length === 0) {
    refreshProcessKnowledgeIndexes(registry, queue, nowIso);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      reason: "empty",
      intervalMs: IDLE_INTERVAL_MS,
    };
    return;
  }

  if (isHighPressureTelemetry(telemetry)) {
    refreshProcessKnowledgeIndexes(registry, queue, nowIso);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "skipped",
      reason: "pressure_skip",
    };
    safeLog("warn", "[process-knowledge] skipping enrichment tick because pressure is high", {
      pressure,
      queueDepth: queue.length,
    });
    return;
  }

  const refreshedQueue = repairQueued > 0 ? peekPendingEnrichmentQueue() : queue;
  const candidate = selectNextQueueItem(refreshedQueue, registry, startedAt);
  if (!candidate.queueItem) {
    refreshProcessKnowledgeIndexes(registry, refreshedQueue, nowIso);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      reason: candidate.reason || "empty",
      skippedCount: refreshedQueue.length,
    };
    return;
  }

  if (candidate.reason === "ignored") {
    const queueRemoved = removePendingEnrichmentEntry(candidate.queueItem.key);
    refreshProcessKnowledgeIndexes(registry, refreshedQueue, nowIso);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      reason: "ignored",
      processedCount: 1,
      skippedCount: 1,
      lastIdentityKey: candidate.queueItem.key,
      queueDepth: queueRemoved ? Math.max(0, refreshedQueue.length - 1) : refreshedQueue.length,
    };
    return;
  }

  if (candidate.reason === "missing_registry") {
    const queueRemoved = removePendingEnrichmentEntry(candidate.queueItem.key);
    refreshProcessKnowledgeIndexes(registry, refreshedQueue, nowIso);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "skipped",
      reason: "missing_registry",
      processedCount: 1,
      skippedCount: 1,
      lastIdentityKey: candidate.queueItem.key,
      queueDepth: queueRemoved ? Math.max(0, refreshedQueue.length - 1) : refreshedQueue.length,
    };
    return;
  }

  const lastSummaryByKey = new Map();
  try {
    const result = await processEnrichmentCandidate(candidate, nowIso, lastSummaryByKey);
    const latestRegistry = loadSeenRegistry();
    const latestQueue = peekPendingEnrichmentQueue();
    refreshProcessKnowledgeIndexes(latestRegistry, latestQueue, nowIso, lastSummaryByKey);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      reason: "tick_complete",
      processedCount: 1,
      knownCount: result.persistedStatus.startsWith("resolved_") ? 1 : 0,
      suspiciousCount: result.persistedStatus === "low_confidence" ? 1 : 0,
      failedCount: 0,
      skippedCount: 0,
      queueDepth: latestQueue.length,
      eligibleCount: 1,
      lastIdentityKey: result.identityKey,
      lastMarkdownFile: result.markdownFile,
      lastQuery: result.query,
      lastProvider: result.webProvider,
      lastError: null,
      lastVerdict: result.verdict?.status || null,
    };
    safeLog("log", "[process-knowledge] enrichment tick complete", {
      identityKey: result.identityKey,
      status: result.status,
      persistedStatus: result.persistedStatus,
      confidence: result.confidence,
      markdownFile: result.markdownFile,
      sourceCount: result.sourceCount,
      provider: result.webProvider,
    });
  } catch (error) {
    const identityKey = toText(candidate.queueItem?.key || candidate.registryEntry?.identity_key || "");
    if (identityKey) {
      try {
        removePendingEnrichmentEntry(identityKey);
      } catch {
        /* ignore */
      }
      try {
        markRegistryFailed(identityKey, {
          last_seen: nowIso,
          last_failed_enrichment: nowIso,
          unresolved_reason: "pipeline_error",
          stale: true,
        });
      } catch {
        /* ignore */
      }
    }

    const latestRegistry = loadSeenRegistry();
    const latestQueue = peekPendingEnrichmentQueue();
    refreshProcessKnowledgeIndexes(latestRegistry, latestQueue, nowIso, lastSummaryByKey);
    lastTickSnapshot = {
      ...lastTickSnapshot,
      completedAt: new Date().toISOString(),
      status: "error",
      reason: String(error?.message || error),
      processedCount: 1,
      failedCount: 1,
      skippedCount: 0,
      queueDepth: latestQueue.length,
      eligibleCount: 1,
      lastIdentityKey: identityKey || null,
      lastMarkdownFile: null,
      lastQuery: candidate?.registryEntry ? buildEvidenceQuery(candidate.registryEntry) : null,
      lastProvider: null,
      lastError: String(error?.message || error),
      lastVerdict: null,
    };
    safeLog("error", "[process-knowledge] enrichment tick failed", error?.message || error);
  }
}

function refreshProcessKnowledgeIndexes(registry, queue, generatedAt, lastSummaryByKey = new Map()) {
  ensureDir(paths.processKnowledgeRoot);
  const { lookupPayload, searchPayload, indexMarkdown } = buildIndexes(
    registry || {},
    queue || [],
    generatedAt,
    lastSummaryByKey
  );
  writeJsonStable(paths.lookupPath, lookupPayload);
  writeJsonStable(paths.searchIndexPath, searchPayload);
  writeStableText(paths.indexPath, indexMarkdown);
}

function seenRegistrySize(registry) {
  return registry && typeof registry === "object" ? Object.keys(registry).length : 0;
}

export function startProcessKnowledgeEnrichmentWorker(opts = {}) {
  if (isRunning) return;
  isRunning = true;
  logger = opts.logger ?? console;
  currentIntervalMs = BASE_INTERVAL_MS;
  lastTickSnapshot = {
    ...createIdleSnapshot(),
    status: "starting",
    reason: "starting",
    intervalMs: currentIntervalMs,
  };
  safeLog("log", "[process-knowledge] enricher starting");
  scheduleNextTick("idle", 0, "low");
}

export function stopProcessKnowledgeEnrichmentWorker() {
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
  safeLog("log", "[process-knowledge] enricher stopped");
}

export function clearProcessKnowledgeEnrichmentState() {
  tickCount = 0;
  currentIntervalMs = BASE_INTERVAL_MS;
  lastTickSnapshot = createIdleSnapshot();
}

export function getProcessKnowledgeEnrichmentSnapshot() {
  const queue = loadPendingEnrichmentQueue();
  return {
    isRunning,
    tickCount,
    intervalMs: currentIntervalMs,
    queueDepth: Array.isArray(queue) ? queue.length : 0,
    ...lastTickSnapshot,
  };
}

export async function runProcessKnowledgeEnrichmentOnce(opts = {}) {
  const previousRunning = isRunning;
  if (opts.logger) {
    logger = opts.logger;
  }
  if (!previousRunning) {
    isRunning = true;
  }

  try {
    await runTick();
    return getProcessKnowledgeEnrichmentSnapshot();
  } finally {
    if (!previousRunning) {
      isRunning = false;
      if (loopTimerId) {
        clearTimeout(loopTimerId);
        loopTimerId = null;
      }
    }
  }
}

export { refreshProcessKnowledgeIndexes };
