export const GROUNDING_SOURCE_KINDS = ["memory", "workspace", "awareness", "official", "web"];
export const GROUNDING_CLAIM_STATUSES = ["grounded", "inference", "conflicted", "unsupported"];
export const toGroundingFreshness = (freshness) => freshness
    ? {
        capturedAt: freshness.capturedAt,
        ageMs: freshness.ageMs,
        isFresh: freshness.isFresh
    }
    : null;
