import { compareStrings } from "./brain-build-utils.mjs";

const SOURCE_PRIORITIES = {
  canonical: 1.0,
  runtime: 0.96,
  web: 0.66,
  import: 0.72,
  draft: 0.48,
  memory: 0.42,
  unknown: 0.35,
};

const ARTIFACT_PRIORITIES = {
  quick_intent: 1.0,
  recent_prompt: 1.0,
  calculator: 0.99,
  recent_digest: 1.0,
  dictionary: 0.98,
  scenario: 0.95,
  compact_fact: 0.88,
  summary: 0.8,
  learned: 0.76,
  chunk: 0.74,
  fallback: 0.1,
  clarification: 0.08,
  idk: 0.06,
};

function preferredArtifactBoost(artifactType, preferredArtifactTypes = []) {
  const idx = preferredArtifactTypes.indexOf(String(artifactType ?? "").replace(/_/g, "-"));
  if (idx < 0) return 0;
  return Math.max(0, 0.08 - idx * 0.015);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getSourcePriority(sourceType) {
  return SOURCE_PRIORITIES[String(sourceType ?? "").toLowerCase()] ?? SOURCE_PRIORITIES.unknown;
}

export function getArtifactPriority(artifactType) {
  return (
    ARTIFACT_PRIORITIES[String(artifactType ?? "").toLowerCase()] ??
    ARTIFACT_PRIORITIES.fallback
  );
}

export function scoreBrainCandidate(candidate, opts = {}) {
  const profile = opts.profile || {};
  const freshnessBias = Math.min(2.5, Math.max(0.25, toNumber(profile.freshnessBias, 1)));
  const sourcePriority = getSourcePriority(candidate.sourceType);
  const artifactPriority = getArtifactPriority(candidate.artifactType);
  const confidence = Math.min(1, Math.max(0, toNumber(candidate.confidence, 0)));
  const freshness = Math.min(1, Math.max(0, toNumber(candidate.freshness, 1)));
  const intentStrength = Math.min(1, Math.max(0, toNumber(candidate.intentStrength, 0)));
  const provenanceQuality = Math.min(1, Math.max(0, toNumber(candidate.provenanceQuality, 0.5)));
  const empiricalSupport = Math.min(1, Math.max(0, toNumber(candidate.empiricalSupport, 0.5)));
  const retrievalSignal = Math.min(
    1,
    Math.max(
      0,
      toNumber(
        candidate.rerankScore ??
          candidate.rrfScoreNormalized ??
          candidate.retrievalSignal ??
          candidate.denseScore ??
          candidate.bm25Score,
        0
      )
    )
  );
  const preferredBoost = preferredArtifactBoost(
    candidate.artifactType,
    Array.isArray(profile.preferredArtifactTypes) ? profile.preferredArtifactTypes : []
  );
  const canonicalBias =
    candidate.sourceType === "canonical"
      ? Math.min(0.1, Math.max(0, (toNumber(profile.canonicalBias, 1.15) - 1) * 0.12))
      : 0;
  const summaryPenalty =
    candidate.artifactType === "summary" && profile.summaryFirst === false ? -0.03 : 0;
  const chunkBoost =
    candidate.artifactType === "chunk" && profile.contextPackStrategy === "chunk-first" ? 0.035 : 0;

  const total =
    confidence * 0.3 +
    sourcePriority * 0.18 +
    artifactPriority * 0.17 +
    freshness * (0.09 * freshnessBias) +
    intentStrength * 0.12 +
    provenanceQuality * 0.08 +
    empiricalSupport * 0.06 +
    retrievalSignal * 0.08 +
    preferredBoost +
    canonicalBias +
    summaryPenalty +
    chunkBoost;

  return {
    total,
    breakdown: {
      confidence,
      sourcePriority,
      artifactPriority,
      freshness,
      intentStrength,
      provenanceQuality,
      empiricalSupport,
      retrievalSignal,
      preferredBoost,
      canonicalBias,
      freshnessBias,
      summaryPenalty,
      chunkBoost,
      total,
    },
  };
}

function compareCandidates(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  const aSource = getSourcePriority(a.sourceType);
  const bSource = getSourcePriority(b.sourceType);
  if (bSource !== aSource) return bSource - aSource;
  const aArtifact = getArtifactPriority(a.artifactType);
  const bArtifact = getArtifactPriority(b.artifactType);
  if (bArtifact !== aArtifact) return bArtifact - aArtifact;
  const aFresh = toNumber(a.freshness, 1);
  const bFresh = toNumber(b.freshness, 1);
  if (bFresh !== aFresh) return bFresh - aFresh;
  return compareStrings(a.candidateId, b.candidateId);
}

export function arbitrateBrainCandidates(candidates, opts = {}) {
  const scored = (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidate && candidate.text)
    .map((candidate) => {
      const score = scoreBrainCandidate(candidate, opts);
      return {
        ...candidate,
        score: score.total,
        scoreBreakdown: score.breakdown,
      };
    })
    .sort(compareCandidates);
  return {
    policy: {
      profileName: opts.profile?.name || "",
      preferredArtifactTypes: opts.profile?.preferredArtifactTypes || [],
      summaryFirst: opts.profile?.summaryFirst !== false,
      canonicalBias: opts.profile?.canonicalBias ?? 1.15,
      freshnessBias: opts.profile?.freshnessBias ?? 1,
      contextPackStrategy: opts.profile?.contextPackStrategy || "summary-first",
    },
    ranked: scored,
    winner: scored[0] || null,
  };
}
