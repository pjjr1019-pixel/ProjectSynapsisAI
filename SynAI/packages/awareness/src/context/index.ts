import type {
  AwarenessContextReason,
  AwarenessDigest,
  FreshnessMetadata
} from "../../../contracts/src/awareness";

const SHORT_SHA_LENGTH = 8;
const DIGEST_FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

const shortHash = (value: string | null | undefined): string => {
  if (!value) {
    return "unknown";
  }

  return value.slice(0, SHORT_SHA_LENGTH);
};

export const summarizeAwarenessDigest = (digest: AwarenessDigest): string => {
  const sessionLabel = `session ${shortHash(digest.sessionId)}`;
  const repoLabel =
    digest.repo.branch && digest.repo.headSha
      ? `${digest.repo.branch}@${shortHash(digest.repo.headSha)}`
      : digest.repo.branch ?? "no-git";
  const repoState =
    digest.repo.dirtyState === "dirty" ? "dirty" : digest.repo.dirtyState === "clean" ? "clean" : "unknown";
  const machineLabel = `${digest.machine.machineName} / ${digest.machine.osVersion}`;
  const commitCount = digest.repo.recentCommits.length;
  const flagCount = digest.repo.activeFeatureFlags.length;
  const freshnessLabel = digest.freshness.isFresh ? "fresh" : "stale";
  const reasonLabel: AwarenessContextReason =
    digest.includeReason === "debug"
      ? "debug"
      : digest.includeReason === "fallback"
        ? "fallback"
        : digest.includeInContext
          ? "relevant"
          : "not_relevant";

  const tokens = [
    sessionLabel,
    digest.session.previousSessionRestored ? "restored" : "new",
    `repo ${repoLabel} ${repoState}`.trim(),
    `machine ${machineLabel}`,
    `commits ${commitCount}`,
    `flags ${flagCount}`,
    freshnessLabel,
    reasonLabel
  ];

  return tokens.join(" | ");
};

export const createFreshnessMetadata = (capturedAt: string, generatedAt: string, now = new Date()): FreshnessMetadata => {
  const observedAt = now.toISOString();
  const ageMs = Math.max(0, Date.parse(observedAt) - Date.parse(generatedAt));

  return {
    capturedAt,
    generatedAt,
    observedAt,
    ageMs,
    staleAfterMs: DIGEST_FRESHNESS_WINDOW_MS,
    isFresh: ageMs <= DIGEST_FRESHNESS_WINDOW_MS
  };
};

export const stampAwarenessDigestFreshness = (
  digest: AwarenessDigest,
  now = new Date()
): AwarenessDigest => ({
  ...digest,
  freshness: createFreshnessMetadata(digest.freshness.capturedAt, digest.freshness.generatedAt, now)
});

export const buildAwarenessContextSection = (
  digest: AwarenessDigest | null | undefined
): string | null => {
  if (!digest || !digest.includeInContext) {
    return null;
  }

  return `Awareness snapshot:\n${digest.summary}`;
};
