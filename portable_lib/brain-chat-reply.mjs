/**
 * Chat reply pipeline (local-first, no network for core path):
 *
 * 1. Normalize query + synonyms
 * 2. Quick exact intents (hi, help, …) — before scenario/BM25 so short queries never hit retrieval
 * 2b. Internal calculator (expr-eval) — arithmetic-only messages before scenario/retrieval
 * 3. Scenario index (Aho–Corasick) + exclusions
 * 4. Fuzzy single-token triggers (edit distance <= 1)
 * 5. BM25 + inverted index over brain chunks (optional index file)
 * 6. Session hints (last turn) boost retrieval
 * 7. Slot hints (tickers, etc.)
 * 8. Clarification when confidence is low (no AI) — or explicit IDK when local LLM is enabled
 * 9. Optional local LLM: fallback | refine | always (brain-local-llm.mjs); when on, every reply is
 *    passed through a variation/refine step so consecutive assistant messages are not verbatim duplicates.
 *
 * opts:
 *   sessionId — session hint key
 *   localLlm — if false, skip all local LLM calls for this request (non-LLM draft only)
 *   fullBrainContext — if true, use retrieval-bm25-full.json when present and dev-all-drafts lexical fallback
 *   attachments — optional [{ name: string, text: string }] merged into the user turn (capped)
 *   internet — if true with local LLM + a configured provider, fetch web snippets (server may rate-limit or disable via env)
 *   internetClientKey — optional rate-limit key (e.g. IP:sessionId) from the HTTP server
 *
 * Env (dev):
 *   HORIZONS_CHAT_DEBUG_TIMING=1 — stderr timings for draft + LLM stages
 *   HORIZONS_LEARNED_QA=0 — disable appending successful LLM replies to learned-qa.jsonl
 */
import process from "node:process";
import {
  completeLocalLlm,
  getLocalLlmConfig,
  refineLocalLlm,
  streamRefineLocalLlm,
} from "./brain-local-llm.mjs";
import { prepareUserQuery } from "./brain-query-normalize.mjs";
import {
  bm25IndexFileExists,
  loadBm25Index,
  loadTextForBm25Chunk,
  rankQueryTermsByBm25Importance,
} from "./brain-retrieval-bm25.mjs";
import { rankHybridChunks } from "./brain-retrieval-hybrid.mjs";
import {
  getSessionHints,
  getConversationHistory,
  recordAssistantReply,
  recordUserTurn,
  recordAssistantTurn,
  updateSessionHints,
} from "./brain-session-store.mjs";
import { extractSlots } from "./brain-slots.mjs";
import { lookupScenarioFuzzy } from "./brain-scenario-fuzzy.mjs";
import {
  lookupScenario,
  lookupScenarioCandidates,
  lookupScenarioMatch,
} from "./brain-scenario-lookup.mjs";
import { tryQuickGreeting } from "./brain-quick-greetings.mjs";
import {
  findChunkByChunkId,
  loadChunkText,
  getProfileConfig,
  resolveChunksForProfile,
  resolveProfileContextArtifacts,
} from "./brain-retrieval.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { appendReviewLog } from "./brain-review-log.mjs";
import { gatherTopBrainSnippetsForLlm } from "./brain-llm-context.mjs";
import {
  appendLearnedQa,
  findLearnedAnswer,
  formatLearnedReply,
  isReusableLearnedQaAnswer,
} from "./brain-learned-qa.mjs";
import { tryMathReply } from "./brain-calculator.mjs";
import {
  consumeInternetRateSlot,
  fetchWebContext,
  formatWebFailureNote,
  mergeWebAndBrainContext,
  isInternetConfigured,
} from "./brain-web-context.mjs";
import { arbitrateBrainCandidates, scoreBrainCandidate } from "./brain-arbitration.mjs";
import { buildContextPack } from "./brain-context-pack.mjs";
import { buildDictionaryTrace, formatDictionaryReply, lookupDictionaryMatch } from "./brain-dictionary.mjs";
import { loadNormalizedDoc } from "./brain-runtime-layer.mjs";
import { persistSessionSnapshot } from "./brain-session-snapshot.mjs";
import { recordIdleLearningMiss } from "./brain-idle-training.mjs";
import { expandQueryWithHyde } from "./brain-query-expand.mjs";
import { decomposeQuery } from "./brain-query-decompose.mjs";
import { rerankChunkCandidates } from "./brain-rerank.mjs";
import { collectRecentBrainDiscovery } from "./brain-recent-discovery.mjs";

const DEFAULT_FALLBACK =
  "I'm Horizons AI. I couldn't match that to a specific answer yet — but I can do a lot! Try asking me to **open** an app or settings panel (e.g. \"open control panel\"), **create** files or folders, **summarize** documents, **search** files, or type **help** for more.";

const CLARIFICATION_REPLY =
  "I'm not sure I understood — but I can open apps & settings, create/read/move/delete files, summarize documents, and search your folders. Try phrasing it as a direct command like \"open calculator\" or \"create a file called notes.txt\". Type **help** for the full list.";

/** When retrieval is weak and local LLM is on — distinct from clarification (no-LLM) and generic fallback */
const IDK_REPLY =
  "I don't have a matching answer in Horizons for that yet — but I can open apps/settings, manage files, summarize documents, and more. Try a direct command like \"open task manager\" or \"create a folder called Projects\". Type **help** for the full list.";

/** Hard cap for worst-case token work */
const MAX_MESSAGE_CHARS = 8000;

/** Total text from uploaded attachments (server also enforces JSON body size) */
const MAX_ATTACHMENT_TOTAL = 256 * 1024;

/** Profile for lexical fallback + full-brain BM25 build (see brain:retrieval:build:full) */
const FULL_RETRIEVAL_PROFILE = "dev-all-drafts";

/**
 * @param {unknown} attachments
 * @returns {{ name: string, text: string }[]}
 */
/**
 * @param {string} displayQuery
 * @param {string} brainRef
 * @param {{
 *   internet?: boolean,
 *   internetClientKey?: string,
 *   localLlm?: boolean,
 *   sessionId?: string,
 * } | undefined} opts
 * @param {ReturnType<typeof getLocalLlmConfig>} llmConfig
 * @param {{ skipRateConsume?: boolean, assumedRateGateOk?: boolean } | undefined} streamOpts
 * @returns {Promise<{ combined: string, webAugmented: boolean, sources: { title: string, url: string }[] }>}
 */
async function buildWebPlusBrainReference(displayQuery, brainRef, opts, llmConfig, streamOpts) {
  /** @type {{ title: string, url: string }[]} */
  const sources = [];
  let webAugmented = false;
  let webBlock = "";

  const wantInternet =
    opts?.internet === true &&
    !!llmConfig &&
    opts?.localLlm !== false &&
    isInternetConfigured();

  if (wantInternet) {
    const clientKey = opts?.internetClientKey || opts?.sessionId || "anon";
    let gateOk = true;
    if (streamOpts?.skipRateConsume) {
      gateOk = !!streamOpts.assumedRateGateOk;
    } else {
      const gate = consumeInternetRateSlot(clientKey);
      gateOk = gate.ok;
    }
    if (!gateOk) {
      const note = formatWebFailureNote({ ok: false, text: "", error: "rate_limited" }, true);
      webBlock = mergeWebAndBrainContext({ text: "", failureNote: note });
      webAugmented = !!webBlock.trim();
    } else {
      const web = await fetchWebContext(displayQuery);
      if (web.sources?.length) {
        for (const s of web.sources) {
          sources.push(s);
        }
      }
      const failureNote = formatWebFailureNote(web, true);
      webBlock = mergeWebAndBrainContext({
        text: web.ok && web.text ? web.text : "",
        failureNote: failureNote || "",
      });
      webAugmented = !!webBlock.trim();
    }
  }

  const parts = [webBlock, brainRef].filter((s) => s && String(s).trim());
  const combined = parts.join("\n\n");
  return { combined, webAugmented, sources };
}

export function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return [];
  const out = [];
  let total = 0;
  for (const a of attachments) {
    const name = String(a?.name ?? "file")
      .replace(/[\r\n]/g, " ")
      .slice(0, 200);
    let text = String(a?.text ?? "");
    const remain = MAX_ATTACHMENT_TOTAL - total;
    if (remain <= 0) break;
    if (text.length > remain) text = text.slice(0, remain);
    total += text.length;
    out.push({ name, text });
  }
  return out;
}

/**
 * @param {string} message
 * @param {unknown} attachments
 * @returns {{ raw: string, attachmentTerms: string[] }}
 */
function buildCombinedInput(message, attachments) {
  const primary = String(message ?? "").trim();
  const parts = sanitizeAttachments(attachments);
  if (!parts.length) {
    const raw = primary.slice(0, MAX_MESSAGE_CHARS);
    return { raw, attachmentTerms: [] };
  }
  const block = parts.map((p) => `### ${p.name}\n${p.text}`).join("\n\n");
  const combined = primary
    ? `${primary}\n\n---\nAdditional context from uploaded files:\n${block}`
    : `Additional context from uploaded files:\n${block}`;
  const raw = combined.slice(0, MAX_MESSAGE_CHARS);
  const attachmentTerms = tokenizeForRetrieval(block).slice(0, 48);
  return { raw, attachmentTerms };
}

/** BM25 scores are corpus-relative; treat very low / ambiguous matches as misses */
const BM25_ABS_FLOOR = 0.055;
const BM25_AMBIGUITY_RATIO = 1.06;
const LIVE_FACT_QUERY_RE =
  /\b(latest|current|today|tonight|tomorrow|now|right now|currently|as of|weather|forecast|temperature|rain|snow|wind|humidity|news|headline|headlines|breaking|stock price|share price|market cap|quote|exchange rate|traffic|flight status|live score|scores|standings|schedule)\b/i;
const LOCAL_RUNTIME_QUERY_RE =
  /\b(horizons|brain|local ai|idle training|crawler|crawl|runtime|session|sessions|promoted|promotion|digest|digests|log|logs|queue|worker|workers|settings|brain browser)\b/i;

function isWeakBm25(bm) {
  if (!bm) return true;
  if (bm.score < BM25_ABS_FLOOR) return true;
  if (bm.secondScore > 0.02 && bm.score < bm.secondScore * BM25_AMBIGUITY_RATIO) return true;
  return false;
}

function isLikelyLiveFactQuery(text) {
  return LIVE_FACT_QUERY_RE.test(String(text || ""));
}

function isLikelyLocalRuntimeQuery(text) {
  return LOCAL_RUNTIME_QUERY_RE.test(String(text || ""));
}

/**
 * Internet is a fallback aid for Local AI, not the first stop for every turn.
 * Use it when the local draft is weak or the user is clearly asking for live/current facts.
 *
 * @param {{ draftSource?: string, display?: string, normalized?: string, bm?: { score: number, secondScore: number } | null }} draft
 * @param {{ internet?: boolean, localLlm?: boolean } | undefined} opts
 * @param {ReturnType<typeof getLocalLlmConfig>} llmConfig
 * @returns {{ enabled: boolean, reason: string }}
 */
function decideInternetFallback(draft, opts, llmConfig) {
  if (opts?.internet !== true) {
    return { enabled: false, reason: "not_requested" };
  }
  if (!llmConfig || opts?.localLlm === false) {
    return { enabled: false, reason: "local_llm_unavailable" };
  }
  if (!isInternetConfigured()) {
    return { enabled: false, reason: "internet_unconfigured" };
  }

  const queryText = `${String(draft?.display || "")} ${String(draft?.normalized || "")}`.trim();
  if (!queryText) {
    return { enabled: false, reason: "empty_query" };
  }
  if (isLikelyLocalRuntimeQuery(queryText)) {
    return { enabled: false, reason: "internal_runtime_query" };
  }

  const weakDraft =
    draft?.draftSource === "clarification" ||
    draft?.draftSource === "idk" ||
    draft?.draftSource === "fallback";
  if (weakDraft) {
    return { enabled: true, reason: "weak_local_draft" };
  }
  if (isLikelyLiveFactQuery(queryText)) {
    return { enabled: true, reason: "live_fact_query" };
  }
  return { enabled: false, reason: "local_answer_sufficient" };
}

/**
 * @param {{ draftSource: string }} draft
 * @returns {'scenario' | 'fuzzy' | 'retrieval' | 'dictionary' | 'learned' | 'calculator' | 'clarification' | 'fallback' | 'idk' | 'recent'}
 */
function mapNonRefinedSource(draft) {
  const ds = draft.draftSource;
  if (ds === "fuzzy") return "fuzzy";
  if (ds === "scenario") return "scenario";
  if (ds === "dictionary") return "dictionary";
  if (ds === "compact_fact") return "retrieval";
  if (ds === "summary") return "retrieval";
  if (ds === "retrieval") return "retrieval";
  if (ds === "learned") return "learned";
  if (ds === "calculator") return "calculator";
  if (ds === "recent") return "recent";
  if (ds === "clarification") return "clarification";
  if (ds === "idk") return "idk";
  return "fallback";
}

function shouldPersistLearnedAnswer(answer, draft) {
  const t = String(answer ?? "").trim();
  if (t.length < 24) return false;
  if (t === CLARIFICATION_REPLY || t === IDK_REPLY) return false;
  if (t.startsWith("Something went wrong")) return false;
  if (draft?.debug?.recentIntent) return false;
  return isReusableLearnedQaAnswer(t, draft?.normalized || "");
}

/** Remove leading YAML front matter so anchor chunks do not surface raw metadata. */
function stripLeadingYamlFrontMatter(text) {
  const s = String(text ?? "");
  const t = s.trimStart();
  if (!t.startsWith("---")) return s;
  const m = t.match(/^---\r?\n[\s\S]*?\r?\n---\s*/);
  if (!m) return s;
  return t.slice(m[0].length).trimStart();
}

function buildRetrievalReply(text) {
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 480);
  return `Based on Horizons knowledge:\n\n${snippet}${text.length > 480 ? "…" : ""}`;
}

function persistTurnArtifacts({
  sessionId,
  profileName,
  draft,
  finalReply,
  localLlm,
  llmMode,
  model,
  error,
}) {
  recordAssistantReply(sessionId, finalReply);
  appendReviewLog({
    sessionId,
    userMessage: draft.display,
    draftSource: draft.draftSource,
    draftPreview: draft.draftReply,
    finalReply,
    localLlm,
    llmMode,
    model,
    turnSeq: getSessionHints(sessionId).turnSeq,
    ...(error ? { error } : {}),
  });
  persistSessionSnapshot({
    sessionId,
    app: "assistant",
    retrievalProfile: profileName,
    turnCount: getSessionHints(sessionId).turnSeq,
    lastSource: draft.draftSource,
    localLlm,
    pinnedDocIds: draft?.debug?.winningDocIds || [],
    stageMatched: draft?.debug?.stageMatched || "",
  });
  if (draft.draftSource === "clarification" || draft.draftSource === "idk") {
    recordIdleLearningMiss(draft.display);
  }
}

function buildCompactFactReply(fact) {
  return `Horizons quick fact:\n\n${String(fact?.fact || "").trim()}`;
}

function buildSummaryReply(summary) {
  return `Horizons summary:\n\n${String(summary?.summary || "").trim()}`;
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function compactSectionRef(docId, start, end) {
  if (typeof start !== "number" || typeof end !== "number" || end <= start) return `${docId}`;
  return `${docId}:${start}-${end}`;
}

function clamp01(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function parseFreshnessInstant(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function freshnessScoreFromInstant(value, fallback = 0.9) {
  const instant = parseFreshnessInstant(value);
  if (!Number.isFinite(instant)) return fallback;
  const ageDays = Math.max(0, (Date.now() - instant) / (1000 * 60 * 60 * 24));
  if (ageDays <= 1) return 1;
  if (ageDays <= 3) return 0.97;
  if (ageDays <= 7) return 0.93;
  if (ageDays <= 14) return 0.86;
  if (ageDays <= 30) return 0.78;
  if (ageDays <= 90) return 0.64;
  return 0.46;
}

function freshnessFromProvenance(provenance = {}, fallback = 0.9) {
  if (typeof provenance?.freshness === "number" && Number.isFinite(provenance.freshness)) {
    return clamp01(provenance.freshness, fallback);
  }
  const sourceType = String(provenance?.sourceType || "").toLowerCase();
  const dateCandidate = provenance?.freshness || provenance?.fetchedAt || provenance?.ingestedAt || "";
  const base =
    sourceType === "canonical"
      ? 1
      : sourceType === "web" || sourceType === "runtime" || sourceType === "import"
        ? 0.88
        : fallback;
  return freshnessScoreFromInstant(dateCandidate, base);
}

function candidateFromQuickReply(normalized, reply) {
  if (!reply) return null;
  return {
    candidateId: `quick:${normalized}`,
    stage: "quick-intent",
    artifactType: "quick_intent",
    sourceType: "runtime",
    text: reply,
    confidence: 0.995,
    freshness: 1,
    intentStrength: 1,
    provenanceQuality: 1,
    empiricalSupport: 0.92,
    docIds: [],
    chunkIds: [],
    pathRefs: [],
    sectionRefs: [],
    why: "matched exact quick-intent greeting/help rule",
  };
}

function candidateFromCalculator(normalized, reply) {
  if (!reply) return null;
  return {
    candidateId: `calc:${normalized}`,
    stage: "calculator",
    artifactType: "calculator",
    sourceType: "runtime",
    text: reply,
    confidence: 0.995,
    freshness: 1,
    intentStrength: 1,
    provenanceQuality: 1,
    empiricalSupport: 0.96,
    docIds: [],
    chunkIds: [],
    pathRefs: [],
    sectionRefs: [],
    why: "matched safe arithmetic calculator path",
  };
}

function candidateFromRecentDiscovery(candidate) {
  if (!candidate?.text) return null;
  return candidate;
}

function candidateFromScenario(candidate) {
  if (!candidate?.reply) return null;
  return {
    candidateId: `scenario:${candidate.rowId}`,
    stage: "scenario",
    artifactType: "scenario",
    sourceType: candidate.sourceType || "canonical",
    text: candidate.reply,
    confidence: clamp01(0.55 + Number(candidate.score || 0), 0.8),
    freshness: 1,
    intentStrength: candidate.explain?.queryMode === "original" ? 0.92 : 0.8,
    provenanceQuality: 0.93,
    empiricalSupport: 0.88,
    docIds: [candidate.rowId],
    chunkIds: [],
    pathRefs: candidate.path ? [candidate.path] : [],
    sectionRefs: candidate.rowId ? [candidate.rowId] : [],
    why: `scenario trigger "${candidate.trigger}" matched`,
    explain: candidate.explain || null,
  };
}

function candidateFromLearned(normalized, display, learnedRaw) {
  if (!learnedRaw) return null;
  return {
    candidateId: `learned:${normalized}`,
    stage: "learned",
    artifactType: "learned",
    sourceType: "memory",
    text: formatLearnedReply(learnedRaw),
    confidence: 0.72,
    freshness: 0.82,
    intentStrength: 0.62,
    provenanceQuality: 0.62,
    empiricalSupport: 0.75,
    docIds: [`learned:${display.toLowerCase()}`],
    chunkIds: [],
    pathRefs: [],
    sectionRefs: [],
    why: "matched learned QA cache entry",
  };
}

function candidateFromDictionary(match) {
  const entry = match?.bestEntry;
  if (!entry) return null;
  const matchType = String(match.bestMatchType || "");
  const bm25Score = Number(match?.bm25Match?.score || 0);
  const exact = matchType === "exact_headword" || matchType === "exact_alias";
  const definitionCount = Array.isArray(entry.definitions) ? entry.definitions.length : 0;
  return {
    candidateId: `dictionary:${entry.entryId}`,
    stage: "dictionary",
    artifactType: "dictionary",
    sourceType: "import",
    text: formatDictionaryReply(entry, { maxDefinitions: 3 }),
    confidence:
      matchType === "exact_headword"
        ? 0.995
        : matchType === "exact_alias"
          ? 0.975
          : clamp01(0.48 + Math.min(0.32, bm25Score * 0.18), 0.68),
    freshness: 0.9,
    intentStrength:
      match.intent?.mode === "single-token"
        ? 0.96
        : match.intent?.mode === "two-token-exact"
          ? 0.97
          : match.intent?.mode
            ? 0.985
            : 0.82,
    provenanceQuality: 0.94,
    empiricalSupport: clamp01(0.72 + Math.min(0.18, definitionCount * 0.04), 0.82),
    docIds: [entry.entryId],
    chunkIds: [],
    pathRefs: [],
    sectionRefs: [entry.entryId],
    why: `matched Webster 1913 dictionary via ${matchType || "bm25"}`,
    dictionaryMatchType: matchType,
    dictionaryBm25Score: bm25Score,
    dictionarySecondScore: Number(match?.bm25Match?.secondScore || 0),
    matchedTerms: match?.bm25Match?.matchedTerms || [],
    rawText: [
      entry.headword,
      ...(entry.partOfSpeech || []),
      ...(entry.definitions || []).slice(0, 3),
      entry.etymology || "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function candidateFromCompactFact(fact) {
  if (!fact?.fact) return null;
  const doc = loadNormalizedDoc(fact.docId);
  const docFreshness = freshnessFromProvenance(doc?.provenance, 0.9);
  return {
    candidateId: `fact:${fact.factId}`,
    stage: "compact-fact",
    artifactType: "compact_fact",
    sourceType: fact.sourceType || "canonical",
    text: buildCompactFactReply(fact),
    confidence: clamp01(0.38 + Number(fact.score || 0), 0.6),
    freshness:
      doc?.provenance?.hash && fact?.provenance?.hash
        ? doc.provenance.hash === fact.provenance.hash
          ? docFreshness
          : 0.35
        : docFreshness,
    intentStrength: clamp01(Number(fact.score || 0), 0.4),
    provenanceQuality: fact?.path ? 0.88 : 0.7,
    empiricalSupport: 0.72,
    docIds: [fact.docId],
    chunkIds: [],
    pathRefs: fact.path ? [fact.path] : [],
    sectionRefs: [compactSectionRef(fact.docId, fact?.provenance?.charStart, fact?.provenance?.charEnd)],
    why: "matched compact fact overlap",
    matchScore: Number(fact.score || 0),
    matchedTerms: fact.explain?.matchedTerms || [],
    rawText: fact.fact,
  };
}

function candidateFromSummary(summary) {
  if (!summary?.summary) return null;
  const doc = loadNormalizedDoc(summary.docId);
  const docFreshness = freshnessFromProvenance(doc?.provenance, 0.9);
  return {
    candidateId: `summary:${summary.docId}`,
    stage: "summary",
    artifactType: "summary",
    sourceType: summary.sourceType || "canonical",
    text: buildSummaryReply(summary),
    confidence: clamp01(0.34 + Number(summary.score || 0), 0.56),
    freshness:
      doc?.provenance?.hash && summary?.provenance?.hash
        ? doc.provenance.hash === summary.provenance.hash
          ? docFreshness
          : 0.4
        : docFreshness,
    intentStrength: clamp01(Number(summary.score || 0), 0.35),
    provenanceQuality: summary?.provenance?.path ? 0.86 : 0.68,
    empiricalSupport: 0.7,
    docIds: [summary.docId],
    chunkIds: toArray(summary.supportingChunkIds),
    pathRefs: summary?.provenance?.path ? [summary.provenance.path] : [],
    sectionRefs: toArray(summary.supportingChunkIds),
    why: "matched profile summary pack",
    matchScore: Number(summary.score || 0),
    matchedTerms: summary.explain?.matchedTerms || [],
    rawText: summary.summary,
  };
}

function candidateFromChunk(row) {
  if (!row?.chunkId) return null;
  const chunk = findChunkByChunkId(row.chunkId);
  const doc = chunk?.docId ? loadNormalizedDoc(chunk.docId) : null;
  const rawChunk = loadTextForBm25Chunk({ chunkId: row.chunkId });
  const text = snippetForRetrieval(rawChunk);
  if (!text) return null;
  const laneHits = Array.isArray(row.laneHits) ? row.laneHits : [row.primaryLane || row.lane || "bm25"];
  const laneCount = laneHits.length;
  const bm25Signal = Math.min(1, Number(row.bm25Score ?? row.score ?? 0));
  const denseSignal = Math.max(0, Number(row.denseScore || row.legacyDenseScore || 0));
  const hybridSignal =
    laneCount > 1 || denseSignal > 0 ? Number(row.rrfScoreNormalized || 0) : bm25Signal;
  const sourceType =
    chunk?.provenance?.sourceType &&
    ["canonical", "draft", "import", "memory"].includes(chunk.provenance.sourceType)
      ? chunk.provenance.sourceType
      : doc?.provenance?.sourceType || "canonical";
  const chunkFreshness = freshnessFromProvenance(
    chunk?.provenance?.fetchedAt || chunk?.provenance?.freshness
      ? { ...(doc?.provenance || {}), ...(chunk?.provenance || {}) }
      : doc?.provenance,
    sourceType === "canonical" ? 1 : 0.9
  );
  return {
    candidateId: `chunk:${row.chunkId}`,
    stage: row.stage || (row.rrfScore ? "hybrid" : row.primaryLane || "bm25"),
    artifactType: "chunk",
    sourceType,
    text: buildRetrievalReply(text),
    confidence: clamp01(0.18 + Math.max(hybridSignal, denseSignal, bm25Signal), 0.3),
    freshness: chunkFreshness,
    intentStrength: clamp01(Math.max(hybridSignal, denseSignal, bm25Signal), 0.32),
    provenanceQuality: chunk?.path ? 0.91 : 0.72,
    empiricalSupport: row.explain?.matchedTerms?.length ? 0.76 : 0.62,
    docIds: chunk?.docId ? [chunk.docId] : [],
    chunkIds: [row.chunkId],
    pathRefs: chunk?.path ? [chunk.path] : [],
    sectionRefs: chunk ? [compactSectionRef(chunk.docId, chunk.charStart, chunk.charEnd)] : [],
    why: "matched exact chunk slice from BM25/hybrid retrieval",
    bm25Score: row.bm25Score ?? row.score,
    bm25SecondScore: row.secondScore ?? 0,
    denseScore: Number(row.denseScore || row.legacyDenseScore || 0),
    rrfScore: Number(row.rrfScore || 0),
    rrfScoreNormalized: Number(row.rrfScoreNormalized || 0),
    retrievalSignal: Math.max(hybridSignal, denseSignal, bm25Signal),
    laneHits,
    primaryLane: row.primaryLane || row.lane || "bm25",
    queryVariants: Array.isArray(row.queryVariants)
      ? row.queryVariants
      : [row.queryVariant || "original"],
    matchedTerms: row.explain?.matchedTerms || [],
    rawText: text,
  };
}

function draftSourceFromCandidate(candidate, fallback) {
  if (!candidate) return fallback;
  switch (candidate.artifactType) {
    case "recent_prompt":
    case "recent_digest":
      return "recent";
    case "quick_intent":
    case "scenario":
      return "scenario";
    case "calculator":
      return "calculator";
    case "dictionary":
      return "dictionary";
    case "learned":
      return "learned";
    case "compact_fact":
      return "compact_fact";
    case "summary":
      return "summary";
    case "chunk":
      return "retrieval";
    default:
      return fallback;
  }
}

function shouldAcceptWinner(candidate) {
  if (!candidate) return false;
  if (candidate.artifactType === "recent_prompt" || candidate.artifactType === "recent_digest") {
    return true;
  }
  if (candidate.artifactType === "quick_intent" || candidate.artifactType === "calculator") {
    return true;
  }
  if (candidate.artifactType === "scenario") {
    return candidate.score >= 0.42;
  }
  if (candidate.artifactType === "dictionary") {
    return (
      candidate.dictionaryMatchType === "exact_headword" ||
      candidate.dictionaryMatchType === "exact_alias" ||
      (candidate.score >= 0.34 && Number(candidate.dictionaryBm25Score || 0) >= 0.18)
    );
  }
  if (candidate.artifactType === "compact_fact") {
    return candidate.score >= 0.36 && Number(candidate.matchScore || 0) >= 0.6;
  }
  if (candidate.artifactType === "summary") {
    return candidate.score >= 0.34 && Number(candidate.matchScore || 0) >= 0.6;
  }
  if (candidate.artifactType === "learned") {
    return candidate.score >= 0.33;
  }
  if (candidate.artifactType === "chunk") {
    return (
      candidate.score >= 0.31 &&
      (Number(candidate.bm25Score || 0) >= 0.11 ||
        Number(candidate.rrfScoreNormalized || candidate.retrievalSignal || 0) >= 0.18 ||
        (Array.isArray(candidate.laneHits) && candidate.laneHits.length > 1))
    );
  }
  return false;
}

function buildProfileExclusionSummary(profile, lexicalProfile) {
  return [
    {
      rule: "profile",
      value: lexicalProfile,
    },
    {
      rule: "allowDraft",
      value: profile.allowDraft,
    },
    {
      rule: "allowImports",
      value: profile.allowImports,
    },
    {
      rule: "allowMemory",
      value: profile.allowMemory,
    },
    {
      rule: "minConfidence",
      value: profile.minConfidence,
    },
    {
      rule: "denseEnabled",
      value: profile.denseEnabled,
    },
    {
      rule: "rrfK",
      value: profile.rrfK,
    },
    {
      rule: "queryExpansion",
      value: profile.queryExpansion,
    },
    {
      rule: "queryDecomposition",
      value: profile.queryDecomposition,
    },
    {
      rule: "rerankMode",
      value: profile.rerankMode,
    },
    {
      rule: "freshnessBias",
      value: profile.freshnessBias,
    },
    {
      rule: "includeDomains",
      value: profile.includeDomains,
    },
  ];
}

function snippetForRetrieval(rawText) {
  if (!rawText || rawText.length < 20) return null;
  const cleaned = stripLeadingYamlFrontMatter(rawText);
  const startsYaml = rawText.trimStart().startsWith("---");
  if (cleaned.length >= 20) return cleaned;
  if (startsYaml && cleaned.length < 20) return null;
  return rawText;
}

const LEGACY_THRESHOLD = 0.2;

function legacyLexicalRetrieval(normalized, profileName) {
  const queryTokens = tokenizeForRetrieval(normalized);
  const chunks = resolveChunksForProfile(profileName);
  let bestChunk = null;
  let bestText = "";
  let bestScore = 0;
  for (const chunk of chunks) {
    const raw = loadChunkText(chunk);
    const text = snippetForRetrieval(raw);
    if (!text) continue;
    const tl = text.toLowerCase();
    let hits = 0;
    for (const t of queryTokens) {
      if (tl.includes(t)) hits += 1;
    }
    const score = queryTokens.length ? hits / queryTokens.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
      bestChunk = chunk;
    }
  }
  if (bestScore >= LEGACY_THRESHOLD && bestText && bestChunk) {
    return {
      reply: buildRetrievalReply(bestText),
      chunk: bestChunk,
      score: bestScore,
      text: bestText,
    };
  }
  return null;
}

function summarizeCandidateForDebug(candidate) {
  if (!candidate) return null;
  return {
    candidateId: candidate.candidateId,
    artifactType: candidate.artifactType,
    sourceType: candidate.sourceType,
    score: candidate.score,
    primaryLane: candidate.primaryLane || "",
  };
}

function isRetrievalBackedCandidate(candidate) {
  return ["compact_fact", "summary", "chunk"].includes(String(candidate?.artifactType || ""));
}

function buildChunkCandidates(bm, bmRanked = []) {
  const out = [];
  const seenChunkIds = new Set();
  if (bm?.chunkId && Number(bm.score || 0) > 0) {
    const rankedRow = bmRanked.find((row) => row.chunkId === bm.chunkId);
    const candidate = candidateFromChunk({
      chunkId: bm.chunkId,
      score: bm.score,
      explain: rankedRow?.explain || bm.explain || null,
    });
    if (candidate) {
      seenChunkIds.add(bm.chunkId);
      out.push(candidate);
    }
  }
  for (const row of bmRanked) {
    if (seenChunkIds.has(row.chunkId)) continue;
    if (Number(row?.score || 0) <= 0) continue;
    const candidate = candidateFromChunk(row);
    if (!candidate) continue;
    seenChunkIds.add(row.chunkId);
    out.push(candidate);
  }
  return out;
}

function buildRetrievalBackedCandidates(routedArtifacts, bm, bmRanked = []) {
  const out = [];
  for (const fact of routedArtifacts?.compactFacts || []) {
    const candidate = candidateFromCompactFact(fact);
    if (candidate) out.push(candidate);
  }
  for (const summary of routedArtifacts?.summaries || []) {
    const candidate = candidateFromSummary(summary);
    if (candidate) out.push(candidate);
  }
  out.push(...buildChunkCandidates(bm, bmRanked));
  return out;
}

function mergeCandidatesById(candidates, profile) {
  const merged = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    if (!candidate?.candidateId || !candidate.text) continue;
    const previous = merged.get(candidate.candidateId);
    if (!previous) {
      merged.set(candidate.candidateId, candidate);
      continue;
    }
    const previousScore = scoreBrainCandidate(previous, { profile }).total;
    const nextScore = scoreBrainCandidate(candidate, { profile }).total;
    if (nextScore > previousScore) {
      merged.set(candidate.candidateId, candidate);
    }
  }
  return [...merged.values()];
}

async function runRetrievalBackedProbe(
  normalizedQuery,
  lexicalProfile,
  retrievalScope,
  extraTerms,
  profile,
  retrievalOpts = {}
) {
  const routedArtifacts = resolveProfileContextArtifacts(normalizedQuery, lexicalProfile, {
    factLimit: 4,
    summaryLimit: 4,
  });
  const hybrid = await rankHybridChunks(normalizedQuery, extraTerms, {
    scope: retrievalScope,
    profileName: lexicalProfile,
    topK: 5,
    densePilot: retrievalOpts.densePilot,
    model: retrievalOpts.model,
    denseQueryVariants: retrievalOpts.denseQueryVariants,
    rrfK: retrievalOpts.rrfK,
  });
  const bm = hybrid.best;
  const bmRanked = hybrid.ranked || [];
  const candidates = buildRetrievalBackedCandidates(routedArtifacts, bm, bmRanked);
  const arbitration = arbitrateBrainCandidates(candidates, { profile });
  return {
    normalizedQuery,
    routedArtifacts,
    hybrid,
    bm,
    bmRanked,
    candidates,
    arbitration,
  };
}

/**
 * Non-LLM draft: calculator → scenario → learned Q&A (JSONL) → retrieval → clarification (no LLM) → IDK (LLM on, weak match) → default fallback.
 * @param {string} message
 * @param {string} profileName
 * @param {{
 *   sessionId?: string,
 *   localLlm?: boolean,
 *   fullBrainContext?: boolean,
 *   internet?: boolean,
 *   internetClientKey?: string,
 *   attachments?: unknown,
 * } | undefined} opts
 * @param {ReturnType<typeof getLocalLlmConfig>} llmConfig
 */
async function buildNonLlmDraft(message, profileName, opts, llmConfig) {
  const { raw: combinedRaw, attachmentTerms: attachmentExtraTerms } = buildCombinedInput(
    message,
    opts?.attachments
  );
  const clipped =
    combinedRaw.length > MAX_MESSAGE_CHARS ? combinedRaw.slice(0, MAX_MESSAGE_CHARS) : combinedRaw;

  const fullBrain = !!opts?.fullBrainContext;
  const retrievalScope =
    fullBrain && bm25IndexFileExists("full") ? /** @type {'full'} */ ("full") : "default";
  const lexicalProfile = fullBrain ? FULL_RETRIEVAL_PROFILE : profileName;
  const profile = getProfileConfig(lexicalProfile);
  const retrievalPolicy = {
    denseEnabled:
      typeof opts?.densePilot === "boolean" ? opts.densePilot : profile.denseEnabled === true,
    denseModel: profile.denseModel || undefined,
    rrfK: profile.rrfK || 60,
    queryExpansion: profile.queryExpansion !== false,
    queryDecomposition: profile.queryDecomposition !== false,
    rerankMode:
      profile.rerankMode && profile.rerankMode !== "off"
        ? profile.rerankMode
        : opts?.retrievalRerank
          ? "heuristic"
          : "off",
  };

  const {
    normalized,
    display,
    expandedTerms = [],
    expandedQuery = "",
    aliasHits = [],
    synonymHits = [],
  } = prepareUserQuery(clipped, { profileName: lexicalProfile });
  const debug = {
    artifactType: "brain-trace",
    schemaVersion: "1.0",
    buildVersion: "brain-ir-runtime-v1",
    builtAt: new Date().toISOString(),
    profileId: lexicalProfile,
    profileName: lexicalProfile,
    queryRaw: display,
    queryNormalized: normalized,
    expansionsUsed: {
      expandedTerms,
      expandedQuery,
      aliasHits,
      synonymHits,
    },
    stageLatencyMs: {},
    stageMatched: "",
    winningArtifactType: "",
    winningSourceType: "",
    winningDocIds: [],
    winningChunkIds: [],
    recentIntent: false,
    recentIntentMode: "",
    learnedQaBypassed: false,
    recentSourceBias: "",
    recentTopic: "",
    pathRefs: [],
    sectionRefs: [],
    scoreBreakdown: {},
    candidateRankings: [],
    excludedByProfile: buildProfileExclusionSummary(profile, lexicalProfile),
    excludedByConfidence: [],
    excludedBySourceType: [
      !profile.allowDraft ? "draft" : null,
      !profile.allowMemory ? "memory" : null,
      !profile.allowImports ? "import" : null,
    ].filter(Boolean),
    fallbackStagesUsed: [],
    finalContextAssembly: null,
    stages: [
      {
        stage: "normalize",
        normalized,
        expandedTerms,
        expandedQuery,
        aliasHits,
        synonymHits,
      },
      {
        stage: "retrieval_policy",
        denseEnabled: retrievalPolicy.denseEnabled,
        denseModel: retrievalPolicy.denseModel || "",
        rrfK: retrievalPolicy.rrfK,
        queryExpansion: retrievalPolicy.queryExpansion,
        queryDecomposition: retrievalPolicy.queryDecomposition,
        rerankMode: retrievalPolicy.rerankMode,
        freshnessBias: profile.freshnessBias ?? 1,
      },
    ],
  };
  if (!normalized) {
    return {
      normalized: "",
      display: clipped.trim(),
      quickReply: null,
      scenarioHit: null,
      sourceTag: /** @type {"scenario"} */ ("scenario"),
      retrievalReply: null,
      bm: null,
      useClarify: false,
      hasIndex: !!loadBm25Index({ scope: retrievalScope }),
      draftReply: DEFAULT_FALLBACK,
      draftSource: /** @type {"fallback"} */ ("fallback"),
      extraTerms: attachmentExtraTerms,
      recentBrainRef: "",
      retrievalScope,
      contextPack: null,
      finalCandidate: null,
      debug,
    };
  }

  const decomposition = decomposeQuery(normalized, {
    ...opts,
    enabled: retrievalPolicy.queryDecomposition,
  });
  const queryExpansion = expandQueryWithHyde(normalized, {
    ...opts,
    enabled: retrievalPolicy.queryExpansion,
  });
  const denseQueryVariants = (queryExpansion.variants || []).slice(1).map((text, index) => ({
    text,
    label: index === 0 ? "hyde" : `variant_${index + 1}`,
  }));
  debug.stages.push({
    stage: "query_decompose",
    enabled: decomposition.enabled,
    strategy: decomposition.strategy,
    complexityScore: decomposition.complexityScore,
    subqueries: decomposition.subqueries || [],
  });
  debug.stages.push({
    stage: "query_expand",
    enabled: queryExpansion.enabled,
    strategy: queryExpansion.strategy,
    hypothetical: queryExpansion.hypothetical || "",
  });

  const recentDiscovery = collectRecentBrainDiscovery(lexicalProfile, display, normalized);
  if (recentDiscovery.intent?.matched) {
    debug.recentIntent = true;
    debug.recentIntentMode = recentDiscovery.intent.mode || "";
    debug.learnedQaBypassed = true;
    debug.recentSourceBias = recentDiscovery.intent.recentSourceBias || "";
    debug.recentTopic = recentDiscovery.intent.recentTopic || "";
    if (recentDiscovery.debugStage) {
      debug.stages.push(recentDiscovery.debugStage);
    }
  }

  const sessionId = opts?.sessionId;
  const hints = getSessionHints(sessionId);
  const slotHints = extractSlots(display);
  const sessionExtra = hints.lastNormalized
    ? tokenizeForRetrieval(hints.lastNormalized).slice(0, 12)
    : [];
  const extraTerms = [...new Set([...slotHints, ...sessionExtra, ...attachmentExtraTerms])];

  const quickReply = tryQuickGreeting(normalized);
  const hasIndex = !!loadBm25Index({ scope: retrievalScope });
  const tQuick = Date.now();
  const mathReply = !attachmentExtraTerms.length ? tryMathReply(display) : null;
  debug.stageLatencyMs.quick = Date.now() - tQuick;

  const tDictionary = Date.now();
  const dictionaryMatch =
    !quickReply && !mathReply ? lookupDictionaryMatch(clipped, normalized) : null;
  debug.stageLatencyMs.dictionary = Date.now() - tDictionary;

  const tArtifacts = Date.now();
  const routedArtifacts = resolveProfileContextArtifacts(normalized, lexicalProfile, {
    factLimit: 4,
    summaryLimit: 4,
  });
  debug.stageLatencyMs.artifactLookup = Date.now() - tArtifacts;

  const tScenario = Date.now();
  const scenarioCandidates = lookupScenarioCandidates(normalized, {
    profileName: lexicalProfile,
    limit: 5,
  });
  const scenarioMatch = scenarioCandidates[0]
    ? {
        reply: scenarioCandidates[0].reply,
        rowId: scenarioCandidates[0].rowId,
        trigger: scenarioCandidates[0].trigger,
        explain: scenarioCandidates[0].explain,
      }
    : lookupScenarioMatch(normalized, { profileName: lexicalProfile });
  let scenarioHit = scenarioMatch?.reply || lookupScenario(normalized, { profileName: lexicalProfile });
  let sourceTag = "scenario";
  if (scenarioMatch) {
    debug.stages.push({
      stage: "scenario",
      rowId: scenarioMatch.rowId,
      trigger: scenarioMatch.trigger,
      queryMode: scenarioMatch.explain?.queryMode,
    });
  }

  if (!scenarioHit) {
    scenarioHit = lookupScenarioFuzzy(normalized);
    if (scenarioHit) {
      sourceTag = "fuzzy";
      debug.stages.push({ stage: "scenario", mode: "fuzzy" });
    }
  }
  debug.stageLatencyMs.scenario = Date.now() - tScenario;

  /** @type {string | null} */
  let learnedRaw = null;
  if (!scenarioHit && !quickReply && !mathReply && !recentDiscovery.intent?.matched) {
    learnedRaw = findLearnedAnswer(normalized);
  }

  /** @type {{ chunkId: string, score: number, secondScore: number } | null} */
  let bm = null;
  let bmRanked = [];
  let hybrid = null;
  let legacy = null;
  let retrievalReply = null;
  let compactReply = null;
  let summaryReply = null;
  const tRetrieval = Date.now();
  if (hasIndex) {
    hybrid = await rankHybridChunks(normalized, extraTerms, {
      scope: retrievalScope,
      profileName: lexicalProfile,
      topK: 5,
      densePilot: retrievalPolicy.denseEnabled,
      model: retrievalPolicy.denseModel,
      denseQueryVariants,
      rrfK: retrievalPolicy.rrfK,
    });
    bm = hybrid.best;
    bmRanked = hybrid.ranked || [];
  } else {
    legacy = legacyLexicalRetrieval(normalized, lexicalProfile);
    if (legacy) {
      debug.stages.push({
        stage: "chunk",
        mode: "legacy_lexical",
      });
    }
  }
  debug.stageLatencyMs.retrieval = Date.now() - tRetrieval;

  let retrievalCandidates = hasIndex
    ? buildRetrievalBackedCandidates(routedArtifacts, bm, bmRanked)
    : [];
  let rerankInfo = { applied: false, mode: "off", candidates: [] };
  if (retrievalCandidates.length) {
    const rerank = await rerankChunkCandidates(
      normalized,
      retrievalCandidates.filter((candidate) => candidate?.artifactType === "chunk"),
      {
        enabled: retrievalPolicy.rerankMode !== "off",
        mode: retrievalPolicy.rerankMode,
        model: retrievalPolicy.denseModel,
        rerankModel: retrievalPolicy.denseModel,
      }
    );
    rerankInfo = rerank;
    if (rerank.applied) {
      const rerankedById = new Map(rerank.candidates.map((candidate) => [candidate.candidateId, candidate]));
      retrievalCandidates = retrievalCandidates.map((candidate) =>
        candidate?.artifactType === "chunk" && rerankedById.has(candidate.candidateId)
          ? rerankedById.get(candidate.candidateId)
          : candidate
      );
    }
  }

  /** @type {any[]} */
  const nonRetrievalCandidates = [];
  const quickCandidate = candidateFromQuickReply(normalized, quickReply);
  if (quickCandidate) nonRetrievalCandidates.push(quickCandidate);
  const calculatorCandidate = candidateFromCalculator(normalized, mathReply);
  if (calculatorCandidate) nonRetrievalCandidates.push(calculatorCandidate);
  const dictionaryCandidate = candidateFromDictionary(dictionaryMatch);
  if (dictionaryCandidate) nonRetrievalCandidates.push(dictionaryCandidate);
  const recentCandidate = candidateFromRecentDiscovery(recentDiscovery.candidate);
  if (recentCandidate) nonRetrievalCandidates.push(recentCandidate);
  for (const row of scenarioCandidates) {
    const candidate = candidateFromScenario(row);
    if (candidate) nonRetrievalCandidates.push(candidate);
  }
  if (scenarioHit && !scenarioCandidates.length && sourceTag === "fuzzy") {
    nonRetrievalCandidates.push({
      candidateId: `fuzzy:${normalized}`,
      stage: "scenario",
      artifactType: "scenario",
      sourceType: "canonical",
      text: scenarioHit,
      confidence: 0.58,
      freshness: 1,
      intentStrength: 0.74,
      provenanceQuality: 0.82,
      empiricalSupport: 0.64,
      docIds: [],
      chunkIds: [],
      pathRefs: [],
      sectionRefs: [],
      why: "matched fuzzy scenario trigger",
    });
  }
  const learnedCandidate = candidateFromLearned(normalized, display, learnedRaw);
  if (learnedCandidate) nonRetrievalCandidates.push(learnedCandidate);
  const candidates = [...nonRetrievalCandidates, ...retrievalCandidates];
  if (!hasIndex && legacy?.chunk) {
    const candidate = candidateFromChunk({
      chunkId: legacy.chunk.chunkId,
      score: legacy.score,
      explain: { matchedTerms: tokenizeForRetrieval(normalized) },
    });
    if (candidate) candidates.push(candidate);
  }

  debug.stages.push({
    stage: "quick",
    quickReply: !!quickReply,
    calculator: !!mathReply,
  });
  debug.stages.push(buildDictionaryTrace(dictionaryMatch));
  debug.stages.push({
    stage: "compact-fact",
    candidateCount: routedArtifacts.compactFacts?.length || 0,
    topFactIds: (routedArtifacts.compactFacts || []).slice(0, 3).map((fact) => ({
      factId: fact.factId,
      docId: fact.docId,
      score: fact.score,
    })),
  });
  debug.stages.push({
    stage: "summary",
    candidateCount: routedArtifacts.summaries?.length || 0,
    topDocIds: (routedArtifacts.summaries || []).slice(0, 3).map((summary) => ({
      docId: summary.docId,
      score: summary.score,
    })),
  });
  debug.stages.push({
    stage: "bm25",
    hybridBest: bm
      ? { chunkId: bm.chunkId, score: bm.score, secondScore: bm.secondScore }
      : null,
    topChunkIds: (hybrid?.bm25 || bmRanked).slice(0, 5).map((row) => ({
      chunkId: row.chunkId,
      score: row.bm25Score ?? row.score,
      matchedTerms: row.explain?.matchedTerms || [],
    })),
  });
  if (hybrid) {
    debug.stages.push({
      stage: "hybrid_retrieval",
      settings: hybrid.settings,
      queryVariants: hybrid.queryVariants,
      topCandidates: bmRanked.slice(0, 5).map((row) => ({
        chunkId: row.chunkId,
        primaryLane: row.primaryLane,
        laneHits: row.laneHits || [],
        rrfScore: row.rrfScore,
        rrfScoreNormalized: row.rrfScoreNormalized,
        bm25Score: row.bm25Score || 0,
        denseScore: row.denseScore || row.legacyDenseScore || 0,
      })),
    });
  }
  if (rerankInfo.applied) {
    debug.stages.push({
      stage: "rerank",
      mode: rerankInfo.mode,
      topCandidates: rerankInfo.candidates.slice(0, 5).map((candidate) => ({
        candidateId: candidate.candidateId,
        rerankScore: candidate.rerankScore,
        overlap: candidate.rerankOverlap,
      })),
    });
  }

  let arbitration = arbitrateBrainCandidates(candidates, { profile });
  const initialArbitration = arbitration;
  let finalCandidate = arbitration.winner;
  let acceptedWinner = shouldAcceptWinner(finalCandidate);
  let mergedRetrievalCandidates = mergeCandidatesById(retrievalCandidates, profile);
  let bestRetrievalArbitration = mergedRetrievalCandidates.length
    ? arbitrateBrainCandidates(mergedRetrievalCandidates, { profile })
    : { winner: null, ranked: [] };
  let bestRetrievalCandidate = bestRetrievalArbitration.winner;
  let bestEffortRetrievalUsed = false;
  let keywordSalvageStage = null;

  if (!acceptedWinner && !llmConfig && hasIndex) {
    const keywordRanking = rankQueryTermsByBm25Importance(normalized, {
      scope: retrievalScope,
      profileName: lexicalProfile,
    });
    const selectedKeywords = keywordRanking.selectedTerms.slice(0, 3);
    const retryQueries = [];
    for (const subquery of decomposition.subqueries || []) {
      if (subquery && subquery !== normalized && !retryQueries.includes(subquery)) {
        retryQueries.push(subquery);
      }
    }
    for (const keyword of selectedKeywords) {
      if (!keyword || keyword === normalized || retryQueries.includes(keyword)) continue;
      retryQueries.push(keyword);
    }
    const combinedKeywordQuery =
      selectedKeywords.length > 1 ? selectedKeywords.join(" ") : selectedKeywords[0] || "";
    if (
      combinedKeywordQuery &&
      combinedKeywordQuery !== normalized &&
      !retryQueries.includes(combinedKeywordQuery)
    ) {
      retryQueries.push(combinedKeywordQuery);
    }

    const retryOrder = [];
    let acceptedSalvageWinner = null;
    for (const retryQuery of retryQueries) {
      const probe = await runRetrievalBackedProbe(
        retryQuery,
        lexicalProfile,
        retrievalScope,
        extraTerms,
        profile,
        {
          densePilot: retrievalPolicy.denseEnabled,
          model: retrievalPolicy.denseModel,
          denseQueryVariants,
          rrfK: retrievalPolicy.rrfK,
        }
      );
      mergedRetrievalCandidates = mergeCandidatesById(
        [...mergedRetrievalCandidates, ...probe.candidates],
        profile
      );
      const probeWinner = probe.arbitration.winner;
      const probeAccepted = shouldAcceptWinner(probeWinner);
      retryOrder.push({
        query: retryQuery,
        winner: summarizeCandidateForDebug(probeWinner),
        accepted: probeAccepted,
        hybridBest: probe.bm
          ? {
              chunkId: probe.bm.chunkId,
              score: probe.bm.score,
              secondScore: probe.bm.secondScore,
            }
          : null,
        topCandidates: probe.arbitration.ranked.slice(0, 3).map(summarizeCandidateForDebug),
      });
      if (probeAccepted) {
        acceptedSalvageWinner = probeWinner;
        bm = probe.bm;
        bmRanked = probe.bmRanked;
        break;
      }
    }

    bestRetrievalArbitration = mergedRetrievalCandidates.length
      ? arbitrateBrainCandidates(mergedRetrievalCandidates, { profile })
      : { winner: null, ranked: [] };
    bestRetrievalCandidate = bestRetrievalArbitration.winner;
    arbitration = arbitrateBrainCandidates([...nonRetrievalCandidates, ...mergedRetrievalCandidates], {
      profile,
    });
    finalCandidate = acceptedSalvageWinner || arbitration.winner;
    acceptedWinner = shouldAcceptWinner(finalCandidate);
    keywordSalvageStage = {
      stage: "keyword_salvage",
      decomposedSubqueries: decomposition.subqueries || [],
      selectedKeywords,
      rankedKeywords: keywordRanking.rankedTerms.map((term) => ({
        term: term.term,
        idf: term.idf,
        documentFrequency: term.documentFrequency,
        hasCorpusMatch: term.hasCorpusMatch,
      })),
      retryOrder,
      arbitrationWinnerBeforeSalvage: summarizeCandidateForDebug(initialArbitration.winner),
      bestRetrievalCandidate: summarizeCandidateForDebug(bestRetrievalCandidate),
    };
  }

  const replyCandidate =
    acceptedWinner && finalCandidate
      ? finalCandidate
      : !llmConfig && hasIndex && bestRetrievalCandidate
        ? bestRetrievalCandidate
        : null;
  bestEffortRetrievalUsed = !acceptedWinner && !llmConfig && hasIndex && !!bestRetrievalCandidate;

  if (keywordSalvageStage) {
    keywordSalvageStage.finalReplyCandidate = summarizeCandidateForDebug(replyCandidate);
    keywordSalvageStage.usedBestEffortRetrieval = bestEffortRetrievalUsed;
    keywordSalvageStage.acceptedFromSalvage = keywordSalvageStage.retryOrder.some(
      (attempt) => attempt.accepted
    );
    debug.stages.push(keywordSalvageStage);
  }
  debug.stages.push({
    stage: "arbitration",
    winner: summarizeCandidateForDebug(finalCandidate),
    replyCandidate: summarizeCandidateForDebug(replyCandidate),
    topCandidates: arbitration.ranked.slice(0, 5).map(summarizeCandidateForDebug),
    policy: arbitration.policy,
    replyMode: acceptedWinner ? "accepted" : bestEffortRetrievalUsed ? "best_effort_retrieval" : "fallback",
  });
  debug.candidateRankings = arbitration.ranked.slice(0, 10).map((candidate) => ({
    candidateId: candidate.candidateId,
    artifactType: candidate.artifactType,
    sourceType: candidate.sourceType,
    score: candidate.score,
    primaryLane: candidate.primaryLane || "",
    laneHits: candidate.laneHits || [],
    queryVariants: candidate.queryVariants || [],
    rrfScore: candidate.rrfScore || 0,
    rrfScoreNormalized: candidate.rrfScoreNormalized || 0,
    denseScore: candidate.denseScore || candidate.legacyDenseScore || 0,
    rerankScore: candidate.rerankScore || 0,
    docIds: candidate.docIds || [],
    chunkIds: candidate.chunkIds || [],
    pathRefs: candidate.pathRefs || [],
    sectionRefs: candidate.sectionRefs || [],
  }));

  const useClarify =
    !acceptedWinner &&
    !bestEffortRetrievalUsed &&
    !llmConfig &&
    hasIndex &&
    (!finalCandidate || finalCandidate.score < 0.31 || isWeakBm25(bm));

  const useIdk =
    !acceptedWinner &&
    !!llmConfig &&
    (!finalCandidate || finalCandidate.score < 0.31 || isWeakBm25(bm));

  /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'dictionary' | 'compact_fact' | 'summary' | 'learned' | 'calculator' | 'clarification' | 'fallback' | 'idk'} */
  let draftSource = "fallback";
  let draftReply = DEFAULT_FALLBACK;
  scenarioHit = null;
  retrievalReply = null;

  if (replyCandidate) {
    draftReply = replyCandidate.text;
    draftSource = draftSourceFromCandidate(replyCandidate, "fallback");
    if (replyCandidate.artifactType === "scenario" || replyCandidate.artifactType === "quick_intent") {
      scenarioHit = replyCandidate.text;
    } else if (replyCandidate.artifactType === "compact_fact") {
      compactReply = replyCandidate.text;
    } else if (replyCandidate.artifactType === "summary") {
      summaryReply = replyCandidate.text;
    } else if (replyCandidate.artifactType === "dictionary") {
      retrievalReply = replyCandidate.text;
    } else if (replyCandidate.artifactType === "chunk") {
      retrievalReply = replyCandidate.text;
    }
  } else if (useClarify) {
    draftReply = CLARIFICATION_REPLY;
    draftSource = "clarification";
  } else if (useIdk) {
    draftReply = IDK_REPLY;
    draftSource = "idk";
  }

  const contextPack = buildContextPack(
    { normalized, display, expandedTerms, expandedQuery, aliasHits, synonymHits },
    lexicalProfile,
    {
      budget: opts.contextPackBudget ?? profile.contextPackBudget,
      persist: opts.persistContextPack === true,
      compactFacts: routedArtifacts.compactFacts || [],
      summaries: routedArtifacts.summaries || [],
      scenarioCandidates,
      rankedChunks: bmRanked,
      extraTerms,
      scope: retrievalScope,
      mode:
        profile.contextPackStrategy === "chunk-first" || profile.summaryFirst === false
          ? "chunk-first"
          : "summary-first",
    }
  );

  debug.stageMatched = replyCandidate ? replyCandidate.stage : draftSource;
  debug.winningArtifactType = replyCandidate ? replyCandidate.artifactType : draftSource;
  debug.winningSourceType = replyCandidate ? replyCandidate.sourceType : "runtime";
  debug.winningDocIds = replyCandidate ? replyCandidate.docIds || [] : [];
  debug.winningChunkIds = replyCandidate ? replyCandidate.chunkIds || [] : [];
  debug.pathRefs = replyCandidate ? replyCandidate.pathRefs || [] : [];
  debug.sectionRefs = replyCandidate ? replyCandidate.sectionRefs || [] : [];
  debug.scoreBreakdown = replyCandidate ? replyCandidate.scoreBreakdown || {} : {};
  debug.excludedByConfidence = arbitration.ranked
    .filter((candidate) => candidate !== replyCandidate && candidate.score < 0.31)
    .slice(0, 5)
    .map((candidate) => ({
      candidateId: candidate.candidateId,
      artifactType: candidate.artifactType,
      score: candidate.score,
    }));
  debug.fallbackStagesUsed = debug.stages
    .map((stage) => stage.stage)
    .filter((stage) => stage !== debug.stageMatched);
  debug.finalContextAssembly = {
    packId: contextPack.packId,
    budget: contextPack.budget,
    usedTokens: contextPack.usedTokens,
    itemKinds: contextPack.items.map((item) => item.kind),
    textPreview: contextPack.text.slice(0, 400),
  };

  if (sessionId) {
    let lastSource = "other";
    if (draftSource === "scenario") lastSource = sourceTag;
    else if (
      draftSource === "compact_fact" ||
      draftSource === "summary" ||
      draftSource === "retrieval" ||
      draftSource === "dictionary"
    ) {
      lastSource = "retrieval";
    } else if (draftSource === "recent") {
      lastSource = "recent";
    } else if (draftSource === "learned") lastSource = "learned";
    else if (draftSource === "calculator") lastSource = "calculator";
    updateSessionHints(sessionId, {
      lastNormalized: normalized,
      lastSource,
    });
  }

  return {
    normalized,
    display,
    quickReply,
    scenarioHit,
    sourceTag,
    retrievalReply,
    compactReply,
    summaryReply,
    bm,
    useClarify,
    hasIndex,
    draftReply,
    draftSource,
    extraTerms,
    recentBrainRef: recentDiscovery.brainRef || "",
    retrievalScope,
    contextPack,
    finalCandidate: replyCandidate,
    debug,
  };
}

/**
 * @param {string} message
 * @param {string} profileName
 * @param {{
 *   sessionId?: string,
 *   localLlm?: boolean,
 *   fullBrainContext?: boolean,
 *   internet?: boolean,
 *   internetClientKey?: string,
 *   attachments?: { name: string, text: string }[],
 * } | undefined} opts
 * @returns {Promise<{ reply: string, source: 'scenario' | 'retrieval' | 'learned' | 'calculator' | 'fallback' | 'local_llm' | 'clarification' | 'fuzzy' | 'refined' | 'idk' | 'recent', sources?: { title: string, url: string }[] }>}
 */
export async function buildChatReply(message, profileName = "repo-knowledge-pack", opts = {}) {
  const t0 = Date.now();
  const llmConfig = opts.localLlm === false ? null : getLocalLlmConfig();
  const draft = await buildNonLlmDraft(message, profileName, opts, llmConfig);
  if (process.env.HORIZONS_CHAT_DEBUG_TIMING === "1") {
    console.error(`[brain-chat-reply] buildNonLlmDraft ${Date.now() - t0}ms`);
  }

  /** Top index snippets for local LLM only (when toggle + server LLM allow). */
  let brainRef = "";
  if (llmConfig && draft.normalized) {
    brainRef =
      draft.recentBrainRef ||
      draft.contextPack?.text ||
      gatherTopBrainSnippetsForLlm(
        draft.normalized,
        draft.extraTerms ?? [],
        draft.retrievalScope ?? "default",
        { profileName }
      );
  }

  const internetDecision = decideInternetFallback(draft, opts, llmConfig);
  if (draft?.debug?.stages) {
    draft.debug.stages.push({
      stage: "internet_policy",
      requested: opts?.internet === true,
      enabled: internetDecision.enabled,
      reason: internetDecision.reason,
    });
  }
  const { combined: combinedContext, webAugmented, sources: webSources } =
    await buildWebPlusBrainReference(
      draft.display,
      brainRef,
      { ...opts, internet: internetDecision.enabled },
      llmConfig,
      undefined
    );

  const weakDraft =
    draft.draftSource === "clarification" ||
    draft.draftSource === "idk" ||
    draft.draftSource === "fallback";

  const sessionId = opts.sessionId;
  const hints = getSessionHints(sessionId);
  const previousAssistant = hints.lastAssistantText || "";
  const conversationHistory = getConversationHistory(sessionId);

  // Record the user turn BEFORE generating a reply so the LLM sees it in context.
  recordUserTurn(sessionId, message);

  const llmCallOpts = {
    ...(webAugmented ? { webAugmented: true } : {}),
    conversationHistory,
  };

  const finishNonLlm = () => {
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: draft.draftReply,
      localLlm: false,
      llmMode: null,
      model: null,
    });
    recordAssistantTurn(sessionId, draft.draftReply);
    return {
      reply: draft.draftReply,
      source: mapNonRefinedSource(draft),
      debug: draft.debug,
    };
  };

  if (draft.draftSource === "calculator") {
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: draft.draftReply,
      localLlm: false,
      llmMode: null,
      model: null,
    });
    recordAssistantTurn(sessionId, draft.draftReply);
    return { reply: draft.draftReply, source: "calculator", debug: draft.debug };
  }

  if (!llmConfig) {
    return finishNonLlm();
  }

  let textToPolish = draft.draftReply;
  /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'learned' | 'clarification' | 'fallback' | 'idk' | 'local_llm'} */
  let polishSource =
    /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'learned' | 'clarification' | 'fallback' | 'idk' | 'local_llm'} */ (
      draft.draftSource
    );

  const debugTiming = process.env.HORIZONS_CHAT_DEBUG_TIMING === "1";
  const tLlm0 = debugTiming ? Date.now() : 0;

  try {
    if (llmConfig.mode === "always") {
      const hasScenarioOrRetrieval = !!(
        draft.scenarioHit ||
        draft.retrievalReply ||
        draft.draftSource === "learned" ||
        draft.draftSource === "recent"
      );
      /** One refine call: draft already contains scripted/retrieved text; skip redundant complete pass. */
      if (hasScenarioOrRetrieval) {
        textToPolish = draft.draftReply;
        polishSource =
          /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'learned' | 'clarification' | 'fallback' | 'idk' | 'local_llm'} */ (
            draft.draftSource
          );
        if (debugTiming) {
          console.error(
            `[brain-chat-reply] always mode: single LLM call (refine only, ${Date.now() - tLlm0}ms setup)`
          );
        }
      } else {
        const extra = combinedContext.trim() ? combinedContext : null;
        textToPolish = await completeLocalLlm(draft.display, extra, llmConfig, llmCallOpts);
        polishSource = "local_llm";
        if (debugTiming) {
          console.error(`[brain-chat-reply] always mode: completeLocalLlm ${Date.now() - tLlm0}ms`);
        }
      }
    } else if (llmConfig.mode === "fallback") {
      if (
        !draft.scenarioHit &&
        !draft.retrievalReply &&
        draft.draftSource !== "learned" &&
        draft.draftSource !== "recent"
      ) {
        textToPolish = await completeLocalLlm(
          draft.display,
          combinedContext.trim() ? combinedContext : null,
          llmConfig,
          llmCallOpts
        );
        polishSource = "local_llm";
        if (debugTiming) {
          console.error(`[brain-chat-reply] fallback completeLocalLlm ${Date.now() - tLlm0}ms`);
        }
      }
    }

    if (
      weakDraft &&
      webAugmented &&
      combinedContext.trim() &&
      (polishSource === "clarification" ||
        polishSource === "idk" ||
        polishSource === "fallback")
    ) {
      textToPolish = await completeLocalLlm(
        draft.display,
        combinedContext,
        llmConfig,
        llmCallOpts
      );
      polishSource = "local_llm";
    }

    if (debugTiming && llmConfig.mode === "refine") {
      console.error(`[brain-chat-reply] refine-only path ${Date.now() - tLlm0}ms before refine`);
    }

    const final = await refineLocalLlm(
      draft.display,
      textToPolish,
      polishSource,
      llmConfig,
      previousAssistant,
      combinedContext.trim() ? combinedContext : undefined,
      llmCallOpts
    );
    if (debugTiming) {
      console.error(`[brain-chat-reply] refineLocalLlm total llm path ${Date.now() - tLlm0}ms`);
    }
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: final,
      localLlm: true,
      llmMode: llmConfig.mode,
      model: llmConfig.model,
    });
    if (opts.localLlm !== false && shouldPersistLearnedAnswer(final, draft)) {
      appendLearnedQa({
        normalized: draft.normalized,
        display: draft.display,
        answer: final,
        model: llmConfig.model,
      });
    }
    if (webSources.length) {
      recordAssistantTurn(sessionId, final);
      return { reply: final, source: "refined", sources: webSources, debug: draft.debug };
    }
    recordAssistantTurn(sessionId, final);
    return { reply: final, source: "refined", debug: draft.debug };
  } catch (e) {
    console.error("[brain-chat-reply] local LLM:", e?.message || e);
    const fallbackReply = textToPolish;
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: fallbackReply,
      localLlm: true,
      llmMode: llmConfig.mode,
      model: llmConfig.model,
      error: String(e?.message || e),
    });
    recordAssistantTurn(sessionId, fallbackReply);
    return {
      reply: fallbackReply,
      source: mapNonRefinedSource(draft),
      debug: draft.debug,
    };
  }
}

export async function explainChatMatch(message, profileName = "repo-knowledge-pack", opts = {}) {
  const llmConfig = null;
  const draft = await buildNonLlmDraft(message, profileName, { ...opts, localLlm: false }, llmConfig);
  return {
    profileName,
    draftSource: draft.draftSource,
    draftReply: draft.draftReply,
    retrievalScope: draft.retrievalScope,
    stageMatched: draft.debug.stageMatched,
    winningArtifactType: draft.debug.winningArtifactType,
    winningSourceType: draft.debug.winningSourceType,
    winningDocIds: draft.debug.winningDocIds,
    winningChunkIds: draft.debug.winningChunkIds,
    recentIntent: draft.debug.recentIntent,
    recentIntentMode: draft.debug.recentIntentMode,
    learnedQaBypassed: draft.debug.learnedQaBypassed,
    recentSourceBias: draft.debug.recentSourceBias,
    recentTopic: draft.debug.recentTopic,
    finalContextAssembly: draft.debug.finalContextAssembly,
    debug: draft.debug,
  };
}

export async function traceBrainMatch(message, profileName = "repo-knowledge-pack", opts = {}) {
  const draft = await buildNonLlmDraft(message, profileName, { ...opts, localLlm: false }, null);
  return draft.debug;
}

/**
 * SSE-friendly path: same pipeline as buildChatReply, but yields token deltas during refine.
 * Non-LLM turns yield a single `{ type: 'final', reply, source }`.
 * LLM turns yield `{ type: 'token', text }` then `{ type: 'done', reply, source: 'refined' }`.
 *
 * @param {string} message
 * @param {string} profileName
 * @param {object} [opts]
 * @returns {AsyncGenerator<{ type: string, reply?: string, source?: string, text?: string, message?: string }, void, undefined>}
 */
export async function* streamBuildChatReply(message, profileName = "repo-knowledge-pack", opts = {}) {
  const llmConfig = opts.localLlm === false ? null : getLocalLlmConfig();
  const draft = await buildNonLlmDraft(message, profileName, opts, llmConfig);

  let brainRef = "";
  if (llmConfig && draft.normalized) {
    brainRef =
      draft.recentBrainRef ||
      draft.contextPack?.text ||
      gatherTopBrainSnippetsForLlm(
        draft.normalized,
        draft.extraTerms ?? [],
        draft.retrievalScope ?? "default",
        { profileName }
      );
  }

  const internetDecision = decideInternetFallback(draft, opts, llmConfig);
  if (draft?.debug?.stages) {
    draft.debug.stages.push({
      stage: "internet_policy",
      requested: opts?.internet === true,
      enabled: internetDecision.enabled,
      reason: internetDecision.reason,
    });
  }
  const willHitInternet = internetDecision.enabled;

  let assumedRateGateOk = false;
  if (willHitInternet) {
    const clientKey = opts?.internetClientKey || opts?.sessionId || "anon";
    const gate = consumeInternetRateSlot(clientKey);
    assumedRateGateOk = gate.ok;
    if (gate.ok) {
      yield { type: "status", phase: "web_fetch" };
    }
  }

  const { combined: combinedContext, webAugmented, sources: webSources } =
    await buildWebPlusBrainReference(
      draft.display,
      brainRef,
      { ...opts, internet: willHitInternet },
      llmConfig,
      {
        skipRateConsume: willHitInternet,
        assumedRateGateOk,
      }
    );

  const weakDraft =
    draft.draftSource === "clarification" ||
    draft.draftSource === "idk" ||
    draft.draftSource === "fallback";
  const llmCallOpts = webAugmented ? { webAugmented: true } : undefined;

  const sessionId = opts.sessionId;
  const hints = getSessionHints(sessionId);
  const previousAssistant = hints.lastAssistantText || "";

  if (draft.draftSource === "calculator") {
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: draft.draftReply,
      localLlm: false,
      llmMode: null,
      model: null,
    });
    yield {
      type: "final",
      reply: draft.draftReply,
      source: "calculator",
    };
    return;
  }

  if (!llmConfig) {
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: draft.draftReply,
      localLlm: false,
      llmMode: null,
      model: null,
    });
    yield {
      type: "final",
      reply: draft.draftReply,
      source: mapNonRefinedSource(draft),
    };
    return;
  }

  let textToPolish = draft.draftReply;
  /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'learned' | 'clarification' | 'fallback' | 'idk' | 'recent' | 'local_llm'} */
  let polishSource =
    /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'learned' | 'clarification' | 'fallback' | 'idk' | 'recent' | 'local_llm'} */ (
      draft.draftSource
    );

  try {
    if (llmConfig.mode === "always") {
      const hasScenarioOrRetrieval = !!(
        draft.scenarioHit ||
        draft.retrievalReply ||
        draft.draftSource === "learned" ||
        draft.draftSource === "recent"
      );
      if (hasScenarioOrRetrieval) {
        textToPolish = draft.draftReply;
        polishSource =
          /** @type {'scenario' | 'fuzzy' | 'retrieval' | 'learned' | 'clarification' | 'fallback' | 'idk' | 'recent' | 'local_llm'} */ (
            draft.draftSource
          );
      } else {
        const extra = combinedContext.trim() ? combinedContext : null;
        textToPolish = await completeLocalLlm(draft.display, extra, llmConfig, llmCallOpts);
        polishSource = "local_llm";
      }
    } else if (llmConfig.mode === "fallback") {
      if (
        !draft.scenarioHit &&
        !draft.retrievalReply &&
        draft.draftSource !== "learned" &&
        draft.draftSource !== "recent"
      ) {
        textToPolish = await completeLocalLlm(
          draft.display,
          combinedContext.trim() ? combinedContext : null,
          llmConfig,
          llmCallOpts
        );
        polishSource = "local_llm";
      }
    }

    if (
      weakDraft &&
      webAugmented &&
      combinedContext.trim() &&
      (polishSource === "clarification" ||
        polishSource === "idk" ||
        polishSource === "fallback")
    ) {
      textToPolish = await completeLocalLlm(
        draft.display,
        combinedContext,
        llmConfig,
        llmCallOpts
      );
      polishSource = "local_llm";
    }

    let full = "";
    for await (const delta of streamRefineLocalLlm(
      draft.display,
      textToPolish,
      polishSource,
      llmConfig,
      previousAssistant,
      combinedContext.trim() ? combinedContext : undefined,
      llmCallOpts
    )) {
      full += delta;
      yield { type: "token", text: delta };
    }
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: full,
      localLlm: true,
      llmMode: llmConfig.mode,
      model: llmConfig.model,
    });
    if (opts.localLlm !== false && shouldPersistLearnedAnswer(full, draft)) {
      appendLearnedQa({
        normalized: draft.normalized,
        display: draft.display,
        answer: full,
        model: llmConfig.model,
      });
    }
    if (webSources.length) {
      yield { type: "done", reply: full, source: "refined", sources: webSources };
    } else {
      yield { type: "done", reply: full, source: "refined" };
    }
  } catch (e) {
    console.error("[brain-chat-reply] streamBuildChatReply:", e?.message || e);
    const fallbackReply = textToPolish;
    persistTurnArtifacts({
      sessionId,
      profileName,
      draft,
      finalReply: fallbackReply,
      localLlm: true,
      llmMode: llmConfig.mode,
      model: llmConfig.model,
      error: String(e?.message || e),
    });
    yield {
      type: "error",
      reply: fallbackReply,
      source: mapNonRefinedSource(draft),
      message: String(e?.message || e),
    };
  }
}
