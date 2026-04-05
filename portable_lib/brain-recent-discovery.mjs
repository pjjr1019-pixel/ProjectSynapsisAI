import { compareStrings } from "./brain-build-utils.mjs";
import { loadAllNormalizedDocs, loadProfileRetrievalMap } from "./brain-runtime-layer.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const GENERIC_RECENT_TERMS = new Set([
  "added",
  "any",
  "been",
  "brain",
  "bring",
  "can",
  "data",
  "has",
  "info",
  "information",
  "knowledge",
  "latest",
  "learned",
  "learning",
  "me",
  "my",
  "new",
  "newly",
  "recent",
  "recently",
  "scraped",
  "scraping",
  "search",
  "show",
  "some",
  "that",
  "thats",
  "the",
  "to",
  "up",
  "web",
  "what",
  "you",
  "your",
]);

const FINANCE_TERMS = new Set([
  "analyst",
  "analysts",
  "bearish",
  "bullish",
  "crypto",
  "earnings",
  "equity",
  "equities",
  "etf",
  "fed",
  "finance",
  "financial",
  "guidance",
  "index",
  "indices",
  "macro",
  "market",
  "markets",
  "portfolio",
  "rate",
  "rates",
  "revenue",
  "sector",
  "sectors",
  "shares",
  "signal",
  "signals",
  "stock",
  "stocks",
  "strategies",
  "strategy",
  "ticker",
  "tickers",
  "trade",
  "trader",
  "traders",
  "trading",
  "treasury",
]);

const RECENT_BRAIN_PATTERNS = [
  /\brecent(?:ly)?\b.*\b(?:brain|learned|added|scrap(?:e|ed|ing)|web|promoted)\b/i,
  /\b(?:brain|learned|added|scrap(?:e|ed|ing)|web|promoted)\b.*\brecent(?:ly)?\b/i,
  /\badded to (?:my|your|the) brain\b/i,
  /\b(?:brain|web)\s+(?:learned|scraped|added)\b/i,
  /\bwhat(?:'s| is)? been added to (?:my|your|the) brain\b/i,
];

const FINANCE_TICKER_PATTERN = /\$?[A-Z]{1,5}\b/;

function normalizeWhitespace(text) {
  return String(text ?? "")
    .replace(/&#8217;|&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function overlapCount(needles, haystack) {
  if (!needles.length || !haystack.length) return 0;
  const hay = new Set(haystack.map((term) => String(term).toLowerCase()));
  return needles.reduce((sum, term) => sum + (hay.has(term) ? 1 : 0), 0);
}

function ratio(part, total) {
  if (!total) return 0;
  return part / total;
}

function isDigestDoc(doc) {
  const rel = String(doc?.path || "").replace(/\\/g, "/");
  return rel.includes("/runtime/learning/promoted/digests/") || rel.includes("/digests/");
}

function extractDateLabel(doc) {
  const probes = [String(doc?.path || ""), String(doc?.docId || ""), String(doc?.title || "")];
  for (const probe of probes) {
    const match = probe.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (match) return match[1];
  }
  return "";
}

function recencyScoreFromDate(dateLabel) {
  if (!dateLabel) return 0.2;
  const ts = Date.parse(`${dateLabel}T00:00:00Z`);
  if (!Number.isFinite(ts)) return 0.2;
  const diffMs = Math.max(0, Date.now() - ts);
  const diffDays = Math.floor(diffMs / 86_400_000);
  return 1 / (1 + diffDays);
}

function collectDocTokens(doc) {
  const summaryTokens = Array.isArray(doc?.summary?.tokens) ? doc.summary.tokens : [];
  const factTokens = Array.isArray(doc?.facts)
    ? doc.facts.flatMap((fact) => (Array.isArray(fact?.tokens) ? fact.tokens : []))
    : [];
  return unique(
    tokenizeForRetrieval(
      [doc?.title || "", doc?.summary?.short || "", doc?.summary?.medium || ""].join(" ")
    ).concat(summaryTokens, factTokens).map((term) => String(term).toLowerCase())
  );
}

function extractSourceHint(doc) {
  for (const fact of Array.isArray(doc?.facts) ? doc.facts : []) {
    const text = normalizeWhitespace(fact?.text || "");
    if (/^source:\s+/i.test(text)) {
      return text.replace(/^source:\s*/i, "").slice(0, 80);
    }
  }
  return "";
}

function selectSnippet(doc, intent) {
  const topicTerms = Array.isArray(intent?.topicTerms) ? intent.topicTerms : [];
  const preferenceTerms = intent?.financeIntent
    ? unique([...topicTerms, ...FINANCE_TERMS])
    : topicTerms;
  const candidates = [];

  for (const bullet of Array.isArray(doc?.summary?.bullets) ? doc.summary.bullets : []) {
    candidates.push(bullet);
  }
  for (const fact of Array.isArray(doc?.facts) ? doc.facts : []) {
    if (fact?.kind === "summary") continue;
    candidates.push(fact?.text || "");
  }
  candidates.push(doc?.summary?.medium || "", doc?.summary?.short || "");

  let bestText = "";
  let bestScore = -1;
  for (const candidate of candidates) {
    const text = normalizeWhitespace(candidate);
    if (!text || /^source:/i.test(text) || /^fetched at:/i.test(text)) continue;
    const tokens = tokenizeForRetrieval(text).map((term) => String(term).toLowerCase());
    const score =
      ratio(overlapCount(preferenceTerms, tokens), Math.max(1, preferenceTerms.length)) +
      (text.length >= 48 ? 0.08 : 0) +
      (text.length <= 260 ? 0.04 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }
  return bestText.slice(0, 240);
}

function topicLabelFromIntent(intent) {
  if (intent.financeIntent) return "finance";
  return intent.topicTerms[0] || "recent additions";
}

export function detectRecentBrainIntent(rawQuery, normalizedQuery = "") {
  const raw = String(rawQuery ?? "").trim();
  const normalized = String(normalizedQuery ?? raw).trim().toLowerCase();
  const matched = RECENT_BRAIN_PATTERNS.some((pattern) => pattern.test(raw) || pattern.test(normalized));
  if (!matched) {
    return {
      matched: false,
      mode: "none",
      financeIntent: false,
      topicTerms: [],
      recentTopic: "",
      recentSourceBias: "",
    };
  }

  const allTokens = tokenizeForRetrieval(normalized).map((term) => String(term).toLowerCase());
  const financeIntent =
    allTokens.some((term) => FINANCE_TERMS.has(term)) ||
    FINANCE_TICKER_PATTERN.test(raw.replace(/\bAI\b/g, ""));
  const topicTerms = allTokens.filter((term) => !GENERIC_RECENT_TERMS.has(term));
  const mode = financeIntent || topicTerms.length ? "topic" : "broad";
  return {
    matched: true,
    mode,
    financeIntent,
    topicTerms,
    recentTopic: mode === "topic" ? topicLabelFromIntent({ financeIntent, topicTerms }) : "",
    recentSourceBias: "learning-digest+promoted-web",
  };
}

function docAllowedForProfile(doc, retrievalMap) {
  if (!doc?.docId) return false;
  if (retrievalMap?.allowedDocIds?.length && !retrievalMap.allowedDocIds.includes(doc.docId)) return false;
  const sourceType = String(doc?.provenance?.sourceType || "").toLowerCase();
  if (sourceType !== "web") return false;
  const rel = String(doc?.path || "").replace(/\\/g, "/");
  return rel.startsWith("runtime/learning/promoted/");
}

function scoreRecentDoc(doc, intent) {
  const tokens = collectDocTokens(doc);
  const dateLabel = extractDateLabel(doc);
  const recency = recencyScoreFromDate(dateLabel);
  const topicHitRatio = ratio(overlapCount(intent.topicTerms, tokens), Math.max(1, intent.topicTerms.length));
  const financeHitRatio = ratio(
    overlapCount([...FINANCE_TERMS], tokens),
    FINANCE_TERMS.size
  );
  let score = recency * 0.48 + topicHitRatio * 0.34;
  if (intent.financeIntent) score += financeHitRatio * 0.3;
  if (doc?.summary?.bullets?.length) score += 0.05;
  if (extractSourceHint(doc)) score += 0.03;
  if (isDigestDoc(doc)) score += 0.12;
  return { score, recency, dateLabel, topicHitRatio, financeHitRatio };
}

function compareRecentRows(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.recency !== a.recency) return b.recency - a.recency;
  if (b.dateLabel !== a.dateLabel) return String(b.dateLabel).localeCompare(String(a.dateLabel));
  return compareStrings(a.docId, b.docId);
}

function buildReplyHeadline(intent, latestDigest) {
  const datePart = latestDigest?.dateLabel ? ` from ${latestDigest.dateLabel}` : "";
  if (intent.financeIntent) {
    return `Here are a few recent finance items the brain learned from the web${datePart}:`;
  }
  if (intent.recentTopic) {
    return `Here are a few recent web-learned additions about ${intent.recentTopic}${datePart}:`;
  }
  return `Here are a few recent web-learned additions${datePart}:`;
}

function buildReplyBullets(matches) {
  return matches.map((match) => {
    const meta = [match.dateLabel, match.sourceHint].filter(Boolean).join("; ");
    return `- ${match.title}: ${match.snippet}${meta ? ` (${meta})` : ""}`;
  });
}

function buildRecentBrainReference(intent, latestDigest, matches) {
  const lines = [
    "[recent-web-learning]",
    `mode: ${intent.mode}`,
    `topic: ${intent.recentTopic || (intent.financeIntent ? "finance" : "general")}`,
    `source-bias: ${intent.recentSourceBias}`,
  ];
  if (latestDigest) {
    lines.push(`latest-digest: ${latestDigest.title} (${latestDigest.dateLabel || "unknown-date"})`);
  }
  for (const match of matches) {
    lines.push("");
    lines.push(`doc: ${match.title}`);
    if (match.dateLabel) lines.push(`date: ${match.dateLabel}`);
    if (match.sourceHint) lines.push(`source: ${match.sourceHint}`);
    lines.push(`summary: ${match.snippet}`);
  }
  return lines.join("\n");
}

export function buildRecentBrainReply(result) {
  const intent = result?.intent;
  if (!intent?.matched || intent.mode === "broad") {
    return [
      "What kind of recent additions do you want me to search for?",
      "",
      "Try: stocks, earnings, AI, macro, crypto, or work/news.",
    ].join("\n");
  }
  if (!Array.isArray(result.matches) || !result.matches.length) {
    return [
      "I don't have strong recent web-learned matches for that topic yet.",
      "",
      "Want me to check stocks, earnings, macro, AI, crypto, or another area?",
    ].join("\n");
  }

  const lines = [buildReplyHeadline(intent, result.latestDigest)];
  if (result.latestDigest) {
    lines.push("");
    lines.push("I checked the latest idle-learning digest first, then the newest promoted web notes.");
  }
  lines.push("");
  lines.push(...buildReplyBullets(result.matches));
  if (intent.financeIntent) {
    lines.push("");
    lines.push("Want me to narrow this to earnings, macro, specific tickers, or trading setups?");
  }
  return lines.join("\n");
}

export function collectRecentBrainDiscovery(profileName, rawQuery, normalizedQuery = "") {
  const intent = detectRecentBrainIntent(rawQuery, normalizedQuery);
  if (!intent.matched) {
    return {
      intent,
      candidate: null,
      debugStage: null,
    };
  }

  const retrievalMap = loadProfileRetrievalMap(profileName);
  const docs = loadAllNormalizedDocs().filter((doc) => docAllowedForProfile(doc, retrievalMap));
  const latestDigest = docs
    .filter((doc) => isDigestDoc(doc))
    .map((doc) => {
      const scored = scoreRecentDoc(doc, intent);
      return {
        doc,
        docId: doc.docId,
        title: doc.title || doc.docId,
        path: doc.path || "",
        dateLabel: scored.dateLabel,
        recency: scored.recency,
      };
    })
    .sort((a, b) => b.recency - a.recency || String(b.dateLabel).localeCompare(String(a.dateLabel)))
    .at(0) || null;

  const scoredMatches = docs
    .filter((doc) => !isDigestDoc(doc))
    .map((doc) => {
      const scored = scoreRecentDoc(doc, intent);
      return {
        doc,
        docId: doc.docId,
        title: String(doc.title || doc.docId).trim(),
        path: doc.path || "",
        sourceHint: extractSourceHint(doc),
        snippet: selectSnippet(doc, intent),
        ...scored,
      };
    })
    .filter((row) => {
      if (!row.snippet) return false;
      if (intent.mode !== "topic") return true;
      if (intent.financeIntent && row.financeHitRatio > 0) return true;
      return intent.topicTerms.length ? row.topicHitRatio > 0 : row.score >= 0.32;
    })
    .sort(compareRecentRows)
    .slice(0, 5);

  const reply = buildRecentBrainReply({
    intent,
    latestDigest,
    matches: scoredMatches,
  });

  const candidate =
    intent.mode === "broad" || !scoredMatches.length
      ? {
          candidateId: `recent:${intent.mode}:${normalizedQuery || rawQuery}`,
          stage: "recent-intent",
          artifactType: "recent_prompt",
          sourceType: "runtime",
          text: reply,
          confidence: 1,
          freshness: 1,
          intentStrength: 1,
          provenanceQuality: 1,
          empiricalSupport: 0.92,
          docIds: latestDigest ? [latestDigest.docId] : [],
          chunkIds: [],
          pathRefs: latestDigest ? [latestDigest.path] : [],
          sectionRefs: latestDigest ? [latestDigest.docId] : [],
          why:
            intent.mode === "broad"
              ? "recent-brain discovery prompt needs topic follow-up"
              : "no strong recent web-learned topic matches found",
          recentSourceBias: intent.recentSourceBias,
          recentTopic: intent.recentTopic,
        }
      : {
          candidateId: `recent:${intent.recentTopic || "recent"}:${normalizedQuery || rawQuery}`,
          stage: "recent-intent",
          artifactType: "recent_digest",
          sourceType: "web",
          text: reply,
          confidence: 0.99,
          freshness: 1,
          intentStrength: 1,
          provenanceQuality: 0.98,
          empiricalSupport: 0.9,
          docIds: unique([
            latestDigest?.docId || "",
            ...scoredMatches.map((row) => row.docId),
          ]),
          chunkIds: [],
          pathRefs: unique([
            latestDigest?.path || "",
            ...scoredMatches.map((row) => row.path),
          ]),
          sectionRefs: unique([
            latestDigest?.docId || "",
            ...scoredMatches.map((row) => row.docId),
          ]),
          why: "matched recent web-learned discovery flow",
          recentSourceBias: intent.recentSourceBias,
          recentTopic: intent.recentTopic,
          retrievalSignal: scoredMatches[0]?.score || 0,
        };

  const brainRef = buildRecentBrainReference(intent, latestDigest, scoredMatches);

  return {
    intent,
    candidate,
    brainRef,
    debugStage: {
      stage: "recent_intent",
      matched: true,
      mode: intent.mode,
      financeIntent: intent.financeIntent,
      recentTopic: intent.recentTopic,
      learnedQaBypassed: true,
      sourceBias: intent.recentSourceBias,
      latestDigest: latestDigest
        ? {
            docId: latestDigest.docId,
            title: latestDigest.title,
            dateLabel: latestDigest.dateLabel,
            path: latestDigest.path,
          }
        : null,
      topRecentDocs: scoredMatches.map((row) => ({
        docId: row.docId,
        title: row.title,
        dateLabel: row.dateLabel,
        score: row.score,
        financeHitRatio: row.financeHitRatio,
        topicHitRatio: row.topicHitRatio,
        path: row.path,
      })),
      llmContextPreview: brainRef.slice(0, 260),
    },
  };
}
