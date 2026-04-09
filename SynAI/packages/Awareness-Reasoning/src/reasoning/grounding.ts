import type { ChatMessage } from "../contracts/chat";
import type {
  GroundingClaim,
  GroundingConflict,
  GroundingMetadata,
  GroundingSource,
  GroundingSourceKind,
  GroundingSourceKindCounts,
  GroundingSummary,
  RetrievalEvalSummary
} from "../contracts/grounding";
import { toGroundingFreshness } from "../contracts/grounding";
import type { RetrievedMemory, WebSearchContext, WebSearchResult } from "../contracts/memory";
import type { WorkspaceChunkHit } from "../contracts/rag";
import type {
  AwarenessConfidenceLevel,
  AwarenessEvidenceBundle,
  AwarenessQueryAnswer,
  EvidenceRef,
  OfficialKnowledgeContext,
  OfficialKnowledgeHit
} from "../contracts/awareness";
import type { ChatReplySourceScope } from "../contracts/chat";

const MAX_SOURCE_EXCERPT_CHARS = 220;
const MAX_VERIFIER_SOURCE_EXCERPT_CHARS = 160;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "with"
]);

const CONTRADICTION_PAIRS: Array<[string, string]> = [
  ["enabled", "disabled"],
  ["running", "stopped"],
  ["success", "failure"],
  ["available", "unavailable"],
  ["connected", "disconnected"],
  ["fresh", "stale"],
  ["present", "missing"],
  ["on", "off"],
  ["true", "false"]
];

export interface BuildGroundingSourceCatalogInput {
  retrievedMemories?: RetrievedMemory[];
  workspaceHits?: WorkspaceChunkHit[];
  awarenessQuery?: AwarenessQueryAnswer | null;
  officialKnowledge?: OfficialKnowledgeContext | null;
  webSearch?: WebSearchContext | null;
}

export interface ParsedGroundingVerifierResult {
  claims: Array<{
    claimIndex: number;
    sourceIds: string[];
    status: GroundingClaim["status"];
    confidence: GroundingClaim["confidence"];
  }>;
  conflicts: Array<{
    description: string;
    sourceIds: string[];
    claimIndexes: number[];
  }>;
}

export interface GroundAssistantReplyInput {
  answerText: string;
  sources: GroundingSource[];
  routeReason: string;
  awarenessQuery?: AwarenessQueryAnswer | null;
  deterministicAwareness?: boolean;
  sourceScopeApplied?: ChatReplySourceScope | null;
  runVerifier?: (messages: ChatMessage[]) => Promise<string>;
}

export interface GroundAssistantReplyResult {
  metadata: GroundingMetadata;
  retrievalEval: RetrievalEvalSummary;
}

const createEmptyKindCounts = (): GroundingSourceKindCounts => ({
  memory: 0,
  workspace: 0,
  awareness: 0,
  official: 0,
  web: 0
});

const clip = (value: string, maxChars = MAX_SOURCE_EXCERPT_CHARS): string =>
  value.trim().length <= maxChars ? value.trim() : `${value.trim().slice(0, maxChars - 1)}...`;

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9.\-_/:\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const unique = <T>(items: T[]): T[] => [...new Set(items)];

const uniqueStrings = (items: string[]): string[] => unique(items.filter(Boolean));

const extractNumbers = (value: string): string[] =>
  uniqueStrings(Array.from(value.matchAll(/\b\d+(?:\.\d+)?%?\b/g), (match) => match[0] ?? ""));

const confidenceFromStatus = (
  status: GroundingClaim["status"],
  fallback: GroundingClaim["confidence"] = "medium"
): GroundingClaim["confidence"] => {
  if (status === "unsupported" || status === "conflicted") {
    return "low";
  }
  if (status === "inference" && fallback === "high") {
    return "medium";
  }
  return fallback;
};

const labelForEvidenceRef = (ref: EvidenceRef): string => ref.label ?? `${ref.kind} evidence`;

const sourceText = (source: GroundingSource): string =>
  `${source.title}\n${source.label}\n${source.excerpt}`;

const sourceCountByKind = (sources: GroundingSource[]): GroundingSourceKindCounts =>
  sources.reduce<GroundingSourceKindCounts>((counts, source) => {
    counts[source.kind] += 1;
    return counts;
  }, createEmptyKindCounts());

const sourceIdForWebResult = (result: WebSearchResult, index: number): string =>
  `web:${result.url || result.title}:${index}`;

const awarenessExcerpt = (answer: AwarenessQueryAnswer): string =>
  clip(
    [
      answer.summary,
      ...answer.bundle.verifiedFindings.slice(0, 2),
      ...answer.bundle.likelyInterpretation.slice(0, 1)
    ]
      .map(normalizeLine)
      .filter(Boolean)
      .join(" | ")
  );

const officialHitsFor = (
  officialKnowledge: OfficialKnowledgeContext | null | undefined,
  awarenessQuery: AwarenessQueryAnswer | null | undefined
): OfficialKnowledgeHit[] => {
  const fromContext = officialKnowledge?.hits ?? [];
  const fromAwareness = awarenessQuery?.officialEvidence ?? awarenessQuery?.bundle.officialEvidence ?? [];
  const seen = new Set<string>();
  const hits: OfficialKnowledgeHit[] = [];

  for (const hit of [...fromContext, ...fromAwareness]) {
    const key = hit.documentId || hit.canonicalUrl;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    hits.push(hit);
  }

  return hits;
};

export const buildGroundingSourceCatalog = (input: BuildGroundingSourceCatalogInput): GroundingSource[] => {
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();
  const addSource = (source: GroundingSource): void => {
    if (seen.has(source.id)) {
      return;
    }
    seen.add(source.id);
    sources.push(source);
  };

  for (const item of input.retrievedMemories ?? []) {
    addSource({
      id: `memory:${item.memory.id}`,
      kind: "memory",
      title: `[${item.memory.category}] ${clip(item.memory.text, 72)}`,
      label: `Conversation ${item.memory.sourceConversationId}`,
      excerpt: clip(item.memory.text)
    });
  }

  for (const hit of input.workspaceHits ?? []) {
    addSource({
      id: `workspace:${hit.chunkId}`,
      kind: "workspace",
      title: hit.relativePath,
      label: `${hit.relativePath}:${hit.startLine}-${hit.endLine}`,
      excerpt: clip(hit.excerpt),
      path: hit.path,
      lineStart: hit.startLine,
      lineEnd: hit.endLine
    });
  }

  const awarenessQuery = input.awarenessQuery ?? null;
  if (awarenessQuery) {
    addSource({
      id: `awareness:bundle:${awarenessQuery.id}`,
      kind: "awareness",
      title: awarenessQuery.intent.label,
      label: "awareness bundle",
      excerpt: awarenessExcerpt(awarenessQuery),
      freshness: toGroundingFreshness(awarenessQuery.bundle.freshness)
    });

    for (const ref of awarenessQuery.bundle.evidenceRefs) {
      if (ref.kind === "official") {
        continue;
      }

      addSource({
        id: `awareness:${ref.kind}:${ref.id}`,
        kind: "awareness",
        title: labelForEvidenceRef(ref),
        label: `${ref.kind} evidence`,
        excerpt: awarenessExcerpt(awarenessQuery),
        url: ref.url ?? null,
        path: ref.path ?? null,
        freshness: toGroundingFreshness(awarenessQuery.bundle.freshness)
      });
    }
  }

  for (const hit of officialHitsFor(input.officialKnowledge, awarenessQuery)) {
    addSource({
      id: `official:${hit.documentId || hit.canonicalUrl}`,
      kind: "official",
      title: hit.title,
      label: hit.domain,
      excerpt: clip(hit.extract),
      url: hit.canonicalUrl,
      freshness: {
        capturedAt: hit.fetchedAt,
        ageMs: Math.max(0, Date.now() - new Date(hit.fetchedAt).getTime()),
        isFresh: true
      }
    });
  }

  if (input.webSearch?.status === "used") {
    input.webSearch.results.forEach((result, index) => {
      addSource({
        id: sourceIdForWebResult(result, index),
        kind: "web",
        title: result.title,
        label: result.source,
        excerpt: clip(result.snippet),
        url: result.url,
        freshness: result.publishedAt
          ? {
              capturedAt: result.publishedAt,
              ageMs: Math.max(0, Date.now() - new Date(result.publishedAt).getTime()),
              isFresh: true
            }
          : null
      });
    });
  }

  return sources;
};

export const segmentAnswerClaims = (answerText: string): string[] => {
  const lines = answerText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const claims: string[] = [];
  const headingLikeLine = (value: string): boolean =>
    /^(?:built now|not built yet|trigger|action|surfacing|extraction|importance|retrieval|summary|why it matters|key facts|unclear|next)$/i.test(
      value.trim()
    );
  const looksCommandLike = (value: string): boolean =>
    /\bms-settings:|control\.exe|\.cpl\b|\.msc\b|regedit(?:\.exe)?\b|hklm\\|hkcu\\|hklm:|hkcu:/i.test(
      value
    );

  for (const line of lines) {
    if (/^[A-Za-z][A-Za-z\s]+:$/.test(line) || headingLikeLine(line)) {
      continue;
    }

    const stripped = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (!stripped) {
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      claims.push(normalizeLine(stripped));
      continue;
    }

    const sentences = stripped
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => normalizeLine(sentence))
      .filter((sentence) => sentence.length > 6 || looksCommandLike(sentence));

    if (sentences.length === 0) {
      claims.push(normalizeLine(stripped));
      continue;
    }

    claims.push(...sentences);
  }

  return uniqueStrings(claims).slice(0, 12);
};

export const createGroundingVerifierMessages = (
  answerText: string,
  claims: string[],
  sources: GroundingSource[]
): ChatMessage[] => {
  const sourceCatalog = sources
    .map(
      (source) =>
        `${source.id} | kind=${source.kind} | title=${source.title} | label=${source.label} | excerpt=${clip(
          source.excerpt,
          MAX_VERIFIER_SOURCE_EXCERPT_CHARS
        )}`
    )
    .join("\n");
  const claimList = claims.map((claim, index) => `${index}. ${claim}`).join("\n");

  return [
    {
      id: "grounding-verifier-system",
      conversationId: "system",
      role: "system",
      createdAt: new Date().toISOString(),
      content: [
        "You verify grounded claims against a provided source catalog.",
        "Return strict JSON only.",
        "Do not add markdown or code fences.",
        "Use only source ids that appear in the catalog.",
        "Each claim must be classified as grounded, inference, conflicted, or unsupported.",
        "Grounded means directly supported by cited sources.",
        "Inference means plausible from cited sources but not directly stated.",
        "Conflicted means cited sources disagree.",
        "Unsupported means no provided source supports it.",
        'Return shape: {"claims":[{"claimIndex":0,"sourceIds":["id"],"status":"grounded","confidence":"high"}],"conflicts":[{"description":"...", "sourceIds":["id"], "claimIndexes":[0]}]}'
      ].join("\n")
    },
    {
      id: "grounding-verifier-user",
      conversationId: "system",
      role: "user",
      createdAt: new Date().toISOString(),
      content: [`Final answer:\n${answerText}`, `Claims:\n${claimList}`, `Sources:\n${sourceCatalog}`].join("\n\n")
    }
  ];
};

const extractJsonObject = (value: string): string | null => {
  const trimmed = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return trimmed.slice(firstBrace, lastBrace + 1);
};

export const parseGroundingVerifierResponse = (
  raw: string,
  claimTexts: string[],
  validSourceIds: string[]
): ParsedGroundingVerifierResult | null => {
  const jsonValue = extractJsonObject(raw);
  if (!jsonValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonValue) as {
      claims?: Array<{
        claimIndex?: number;
        sourceIds?: string[];
        status?: GroundingClaim["status"];
        confidence?: GroundingClaim["confidence"];
      }>;
      conflicts?: Array<{
        description?: string;
        sourceIds?: string[];
        claimIndexes?: number[];
      }>;
    };
    const sourceIdSet = new Set(validSourceIds);
    const claims = (parsed.claims ?? [])
      .map((claim, index) => {
        const claimIndex = claim.claimIndex ?? index;
        if (claimIndex < 0 || claimIndex >= claimTexts.length) {
          return null;
        }

        const status = claim.status;
        if (
          status !== "grounded" &&
          status !== "inference" &&
          status !== "conflicted" &&
          status !== "unsupported"
        ) {
          return null;
        }

        return {
          claimIndex,
          sourceIds: uniqueStrings((claim.sourceIds ?? []).filter((sourceId) => sourceIdSet.has(sourceId))),
          status,
          confidence: confidenceFromStatus(status, claim.confidence ?? "medium")
        };
      })
      .filter((claim): claim is ParsedGroundingVerifierResult["claims"][number] => claim !== null);

    if (claims.length === 0) {
      return null;
    }

    const conflicts = (parsed.conflicts ?? [])
      .map((conflict) => {
        const claimIndexes = unique((conflict.claimIndexes ?? []).filter((claimIndex) => claimIndex >= 0 && claimIndex < claimTexts.length));
        if (!conflict.description || claimIndexes.length === 0) {
          return null;
        }
        return {
          description: normalizeLine(conflict.description),
          sourceIds: uniqueStrings((conflict.sourceIds ?? []).filter((sourceId) => sourceIdSet.has(sourceId))),
          claimIndexes
        };
      })
      .filter(
        (conflict): conflict is ParsedGroundingVerifierResult["conflicts"][number] => conflict !== null
      );

    return {
      claims,
      conflicts
    };
  } catch {
    return null;
  }
};

const claimLooksInference = (claimText: string): boolean =>
  /\b(may|might|could|likely|probably|appears|suggests|unclear|uncertain|why it matters)\b/i.test(claimText);

const scoreSourceForClaim = (claimText: string, source: GroundingSource): number => {
  const claimTokens = tokenize(claimText);
  const sourceTokens = new Set(tokenize(sourceText(source)));
  if (claimTokens.length === 0 || sourceTokens.size === 0) {
    return 0;
  }

  const shared = claimTokens.filter((token) => sourceTokens.has(token));
  const exactNumbers = extractNumbers(claimText).filter((token) => sourceText(source).includes(token));
  const base = shared.length / claimTokens.length;
  return base + exactNumbers.length * 0.18 + (source.title.toLowerCase().includes(claimText.toLowerCase()) ? 0.2 : 0);
};

const detectConflictDescription = (sources: GroundingSource[], claimText: string): string | null => {
  if (sources.length < 2) {
    return null;
  }

  const combined = sources.map((source) => sourceText(source).toLowerCase());
  for (const [left, right] of CONTRADICTION_PAIRS) {
    const hasLeft = combined.some((value) => value.includes(left));
    const hasRight = combined.some((value) => value.includes(right));
    if (hasLeft && hasRight) {
      return `Sources disagree about whether "${left}" or "${right}" is true for "${claimText}".`;
    }
  }

  const numericValues = uniqueStrings(sources.flatMap((source) => extractNumbers(sourceText(source))));
  if (numericValues.length >= 2) {
    return `Sources cite different numeric values for "${claimText}".`;
  }

  return null;
};

const buildHeuristicClaims = (
  claimTexts: string[],
  sources: GroundingSource[]
): { claims: GroundingClaim[]; conflicts: GroundingConflict[] } => {
  const claims: GroundingClaim[] = [];
  const conflicts: GroundingConflict[] = [];

  for (const [index, claimText] of claimTexts.entries()) {
    const rankedSources = sources
      .map((source) => ({ source, score: scoreSourceForClaim(claimText, source) }))
      .filter((entry) => entry.score >= 0.18)
      .sort((left, right) => right.score - left.score);
    const matchedSources = rankedSources.slice(0, 2).map((entry) => entry.source);
    const sourceIds = matchedSources.map((source) => source.id);
    const conflictDescription = detectConflictDescription(matchedSources, claimText);
    const inference = claimLooksInference(claimText);
    const status: GroundingClaim["status"] =
      sourceIds.length === 0
        ? "unsupported"
        : conflictDescription
          ? "conflicted"
          : inference
            ? "inference"
            : "grounded";
    const confidence: GroundingClaim["confidence"] =
      status === "unsupported" || status === "conflicted"
        ? "low"
        : status === "inference"
          ? sourceIds.length >= 2 ? "medium" : "low"
          : matchedSources.length >= 2 && rankedSources[0]?.score >= 0.55
            ? "high"
            : "medium";

    const claimId = `claim:${index}`;
    claims.push({
      id: claimId,
      text: claimText,
      sourceIds,
      status,
      confidence
    });

    if (conflictDescription) {
      conflicts.push({
        id: `conflict:${index}`,
        description: conflictDescription,
        sourceIds,
        claimIds: [claimId]
      });
    }
  }

  return { claims, conflicts };
};

const overlapScore = (left: string, right: string): number => {
  const leftTokens = tokenize(left);
  const rightTokens = new Set(tokenize(right));
  if (leftTokens.length === 0 || rightTokens.size === 0) {
    return 0;
  }
  const shared = leftTokens.filter((token) => rightTokens.has(token)).length;
  return shared / leftTokens.length;
};

const commandTokensFor = (value: string): string[] =>
  uniqueStrings(
    Array.from(
      value.matchAll(/(?:ms-settings:[^\s,;]+|control\.exe\s+[^\s,;]+|[a-z0-9_-]+\.cpl\b|[a-z0-9_-]+\.msc\b|regedit(?:\.exe)?\b|hk(?:lm|cu)[^ \n\r\t,;]*)/gi),
      (match) => normalizeLine(match[0] ?? "")
    )
  );

const directClaimMatch = (claimText: string, evidenceText: string): boolean => {
  const normalizedClaim = normalizeLine(claimText).toLowerCase();
  const normalizedEvidence = normalizeLine(evidenceText).toLowerCase();
  if (!normalizedClaim || !normalizedEvidence) {
    return false;
  }

  if (normalizedEvidence.includes(normalizedClaim) || normalizedClaim.includes(normalizedEvidence)) {
    return true;
  }

  const claimCommands = commandTokensFor(normalizedClaim);
  const evidenceCommands = new Set(commandTokensFor(normalizedEvidence));
  if (claimCommands.some((token) => evidenceCommands.has(token))) {
    return true;
  }

  return overlapScore(normalizedClaim, normalizedEvidence) >= 0.5;
};

const bestMatchingSourceIds = (
  sourceIds: string[],
  fallbackIds: string[],
  limit = 2
): string[] => {
  if (sourceIds.length > 0) {
    return sourceIds.slice(0, limit);
  }
  return fallbackIds.slice(0, limit);
};

export const buildDeterministicAwarenessGrounding = (
  answerText: string,
  awarenessQuery: AwarenessQueryAnswer,
  sources: GroundingSource[]
): { claims: GroundingClaim[]; conflicts: GroundingConflict[] } => {
  const claimTexts = segmentAnswerClaims(answerText);
  const awarenessSourceIds = sources.filter((source) => source.kind === "awareness").map((source) => source.id);
  const officialSourceIds = sources.filter((source) => source.kind === "official").map((source) => source.id);
  const findMatchingSourceIds = (claimText: string, sourceKind: GroundingSource["kind"]): string[] =>
    sources
      .filter((source) => source.kind === sourceKind)
      .filter((source) => directClaimMatch(claimText, sourceText(source)))
      .map((source) => source.id)
      .slice(0, 3);

  const claims: GroundingClaim[] = claimTexts.map((claimText, index) => {
    const claimId = `claim:${index}`;
    const matchesVerified =
      awarenessQuery.bundle.verifiedFindings.some((item) => directClaimMatch(claimText, item)) ||
      awarenessQuery.bundle.officialVerified.some((item) => directClaimMatch(claimText, item));
    const matchesInference =
      claimLooksInference(claimText) ||
      awarenessQuery.bundle.likelyInterpretation.some((item) => directClaimMatch(claimText, item)) ||
      awarenessQuery.bundle.inferredFindings.some((item) => directClaimMatch(claimText, item)) ||
      awarenessQuery.bundle.uncertainty.some((item) => directClaimMatch(claimText, item));
    const officialOnly =
      awarenessQuery.bundle.officialVerified.some((item) => directClaimMatch(claimText, item)) ||
      /\bmicrosoft says\b/i.test(claimText);
    const sourceIds = officialOnly
      ? bestMatchingSourceIds(findMatchingSourceIds(claimText, "official"), officialSourceIds, 3)
      : bestMatchingSourceIds(findMatchingSourceIds(claimText, "awareness"), awarenessSourceIds, 3);
    const status: GroundingClaim["status"] =
      sourceIds.length === 0
        ? "unsupported"
        : matchesVerified
          ? "grounded"
          : matchesInference
            ? "inference"
            : "unsupported";

    return {
      id: claimId,
      text: claimText,
      sourceIds,
      status,
      confidence:
        status === "unsupported"
          ? "low"
          : status === "inference"
            ? awarenessQuery.bundle.confidenceLevel === "high"
              ? "medium"
              : "low"
            : awarenessQuery.bundle.confidenceLevel
    };
  });

  return {
    claims,
    conflicts: []
  };
};

const mergeVerifierWithHeuristics = (
  claimTexts: string[],
  parsed: ParsedGroundingVerifierResult,
  heuristic: { claims: GroundingClaim[]; conflicts: GroundingConflict[] }
): { claims: GroundingClaim[]; conflicts: GroundingConflict[] } => {
  const claims = claimTexts.map((claimText, index) => {
    const parsedClaim = parsed.claims.find((claim) => claim.claimIndex === index);
    const fallback = heuristic.claims[index];
    if (!parsedClaim) {
      return fallback;
    }

    const sourceIds = parsedClaim.sourceIds.length > 0 ? parsedClaim.sourceIds : fallback.sourceIds;
    const status =
      parsedClaim.status === "unsupported" && fallback.sourceIds.length > 0 ? fallback.status : parsedClaim.status;

    return {
      id: fallback.id,
      text: claimText,
      sourceIds,
      status,
      confidence: confidenceFromStatus(status, parsedClaim.confidence ?? fallback.confidence)
    };
  });

  const conflicts =
    parsed.conflicts.length > 0
      ? parsed.conflicts.map((conflict, index) => ({
          id: `conflict:${index}`,
          description: conflict.description,
          sourceIds: conflict.sourceIds,
          claimIds: conflict.claimIndexes.map((claimIndex) => claims[claimIndex]?.id).filter(Boolean)
        }))
      : heuristic.conflicts;

  return {
    claims,
    conflicts
  };
};

const usedSourceIdsFor = (claims: GroundingClaim[]): string[] =>
  uniqueStrings(claims.flatMap((claim) => claim.sourceIds));

export const buildGroundingSummary = (input: {
  claims: GroundingClaim[];
  conflicts: GroundingConflict[];
  sources: GroundingSource[];
  awarenessConfidenceLevel?: AwarenessConfidenceLevel | null;
  awarenessTraceCount?: number;
}): GroundingSummary => {
  const claimCount = input.claims.length;
  const groundedClaimCount = input.claims.filter((claim) => claim.status === "grounded").length;
  const inferenceClaimCount = input.claims.filter((claim) => claim.status === "inference").length;
  const conflictedClaimCount = input.claims.filter((claim) => claim.status === "conflicted").length;
  const unsupportedClaimCount = input.claims.filter((claim) => claim.status === "unsupported").length;
  const usedSourceIds = usedSourceIdsFor(input.claims);
  const usedSources = input.sources.filter((source) => usedSourceIds.includes(source.id));
  const sourceKindCounts = sourceCountByKind(input.sources);
  const uniqueSourceKindCount = new Set(usedSources.map((source) => source.kind)).size;
  const citationCoverage =
    claimCount === 0 ? 0 : Number((input.claims.filter((claim) => claim.sourceIds.length > 0).length / claimCount).toFixed(2));
  const staleUsedSourceCount = usedSources.filter((source) => source.freshness && !source.freshness.isFresh).length;
  const topSourceIds = Object.entries(
    input.claims.reduce<Record<string, number>>((counts, claim) => {
      for (const sourceId of claim.sourceIds) {
        counts[sourceId] = (counts[sourceId] ?? 0) + 1;
      }
      return counts;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .map(([sourceId]) => sourceId)
    .slice(0, 3);

  const strongAwarenessSupport =
    input.awarenessConfidenceLevel === "high" && (input.awarenessTraceCount ?? 0) >= 2;

  let overallConfidence: GroundingSummary["overallConfidence"] = "low";
  if (claimCount > 0 && usedSourceIds.length > 0) {
    if (conflictedClaimCount > 0) {
      overallConfidence = "low";
    } else if (unsupportedClaimCount > 0) {
      overallConfidence =
        uniqueSourceKindCount >= 2 && groundedClaimCount >= Math.max(1, claimCount - unsupportedClaimCount)
          ? "medium"
          : "low";
    } else if (
      staleUsedSourceCount === 0 &&
      groundedClaimCount > 0 &&
      inferenceClaimCount === 0 &&
      (uniqueSourceKindCount >= 2 || strongAwarenessSupport)
    ) {
      overallConfidence = "high";
    } else if (usedSourceIds.length === 1 || staleUsedSourceCount > 0) {
      overallConfidence = "medium";
    } else {
      overallConfidence = groundedClaimCount > 0 ? "medium" : "low";
    }
  }

  return {
    overallConfidence,
    claimCount,
    groundedClaimCount,
    inferenceClaimCount,
    conflictedClaimCount,
    unsupportedClaimCount,
    usedSourceCount: usedSourceIds.length,
    unusedSourceCount: Math.max(0, input.sources.length - usedSourceIds.length),
    uniqueSourceKindCount,
    citationCoverage,
    sourceKindCounts,
    topSourceIds
  };
};

export const buildRetrievalEvalSummary = (input: {
  routeReason: string;
  sources: GroundingSource[];
  summary: GroundingSummary;
}): RetrievalEvalSummary => {
  const warnings: string[] = [];
  if (input.summary.claimCount === 0) {
    warnings.push("No claims were extracted from the final answer.");
  }
  if (input.summary.conflictedClaimCount > 0) {
    warnings.push("Sources conflict for at least one claim.");
  }
  if (input.summary.unsupportedClaimCount > 0) {
    warnings.push("Some claims are unsupported.");
  }
  if (input.summary.citationCoverage < 1 && input.summary.claimCount > 0) {
    warnings.push("Not every claim has a citation.");
  }
  if (input.summary.unusedSourceCount > input.summary.usedSourceCount && input.sources.length > 1) {
    warnings.push("Most retrieved sources were not cited.");
  }
  if (input.summary.uniqueSourceKindCount <= 1 && input.summary.usedSourceCount > 0) {
    warnings.push("Answer relies on a single source kind.");
  }
  if (input.sources.some((source) => source.freshness && !source.freshness.isFresh)) {
    warnings.push("At least one cited source is stale.");
  }

  return {
    routeReason: input.routeReason,
    retrievedSourceCount: input.sources.length,
    usedSourceCount: input.summary.usedSourceCount,
    unusedSourceCount: input.summary.unusedSourceCount,
    citationCoverage: input.summary.citationCoverage,
    unsupportedClaimCount: input.summary.unsupportedClaimCount,
    conflictedClaimCount: input.summary.conflictedClaimCount,
    sourceKindCounts: input.summary.sourceKindCounts,
    topSourceIds: input.summary.topSourceIds,
    warnings
  };
};

export const groundAssistantReply = async (
  input: GroundAssistantReplyInput
): Promise<GroundAssistantReplyResult> => {
  const claimTexts = segmentAnswerClaims(input.answerText);
  const heuristic = buildHeuristicClaims(claimTexts, input.sources);
  let grounded = heuristic;

  if (input.deterministicAwareness && input.awarenessQuery) {
    grounded = buildDeterministicAwarenessGrounding(input.answerText, input.awarenessQuery, input.sources);
  } else if (input.runVerifier && input.sources.length > 0 && claimTexts.length > 0) {
    try {
      const raw = await input.runVerifier(createGroundingVerifierMessages(input.answerText, claimTexts, input.sources));
      const parsed = parseGroundingVerifierResponse(raw, claimTexts, input.sources.map((source) => source.id));
      if (parsed) {
        grounded = mergeVerifierWithHeuristics(claimTexts, parsed, heuristic);
      }
    } catch {
      grounded = heuristic;
    }
  }

  const summary = buildGroundingSummary({
    claims: grounded.claims,
    conflicts: grounded.conflicts,
    sources: input.sources,
    awarenessConfidenceLevel: input.awarenessQuery?.bundle.confidenceLevel ?? null,
    awarenessTraceCount: input.awarenessQuery?.bundle.evidenceTraceIds.length ?? 0
  });
  const claimExtractionMode: NonNullable<GroundAssistantReplyResult["metadata"]["claimExtractionMode"]> =
    input.deterministicAwareness
      ? "deterministic-awareness"
      : /(?:^|\n)\s*(?:[-*]|\d+\.)\s+/m.test(input.answerText) || /^[A-Za-z][A-Za-z\s]+:\s+/m.test(input.answerText)
        ? "structured"
        : "default";
  const matchedEvidenceIds = usedSourceIdsFor(grounded.claims);

  return {
    metadata: {
      sources: input.sources,
      claims: grounded.claims,
      conflicts: grounded.conflicts,
      summary,
      claimExtractionMode,
      matchedEvidenceIds,
      sourceScopeApplied: input.sourceScopeApplied ?? null
    },
    retrievalEval: buildRetrievalEvalSummary({
      routeReason: input.routeReason,
      sources: input.sources,
      summary
    })
  };
};
