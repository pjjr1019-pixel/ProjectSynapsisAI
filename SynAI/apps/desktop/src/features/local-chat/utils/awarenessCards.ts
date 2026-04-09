import type {
  AwarenessAnswerCard,
  AwarenessQueryAnswer,
  AwarenessStartupDigest,
  ChatMessageMetadata
} from "@contracts";

const LIVE_REFRESH_DEFAULT_MS = 2_000;

export const buildAwarenessMessageMetadata = (
  answer: AwarenessQueryAnswer,
  query: string,
  options?: {
    refreshedAt?: string | null;
    refreshEveryMs?: number | null;
  }
): ChatMessageMetadata => ({
  awareness: {
    intentFamily: answer.intent.family,
    answerMode: answer.answerMode ?? null,
    query,
    refreshEveryMs: options?.refreshEveryMs ?? null,
    lastRefreshedAt: options?.refreshedAt ?? answer.generatedAt,
    confidenceLevel: answer.bundle.confidenceLevel,
    card: answer.card ?? null
  }
});

export const buildLiveAwarenessMessageMetadata = (
  answer: AwarenessQueryAnswer,
  query: string,
  refreshedAt = answer.generatedAt
): ChatMessageMetadata =>
  buildAwarenessMessageMetadata(answer, query, {
    refreshedAt,
    refreshEveryMs: LIVE_REFRESH_DEFAULT_MS
  });

export const buildStartupDigestCard = (digest: AwarenessStartupDigest): AwarenessAnswerCard => ({
  kind: "startup-digest",
  title: digest.title,
  subtitle: digest.summary,
  metrics: [
    {
      label: "Highlights",
      value: `${digest.highlights.length}`
    },
    {
      label: "Patterns",
      value: `${digest.recurringPatterns.length}`
    }
  ],
  sections: [
    {
      label: "New since last run",
      items: digest.highlights
    },
    ...(digest.whyItMatters.length > 0
      ? [
          {
            label: "Why it matters",
            items: digest.whyItMatters
          }
        ]
      : []),
    ...(digest.recurringPatterns.length > 0
      ? [
          {
            label: "Recurring patterns",
            items: digest.recurringPatterns
          }
        ]
      : [])
  ],
  footer: digest.safeNextAction ?? null
});
