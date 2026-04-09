import type { AwarenessConfidenceLevel, FreshnessMetadata } from "./awareness";
import type { ChatReplySourceScope } from "./chat";

export const GROUNDING_SOURCE_KINDS = ["memory", "workspace", "awareness", "official", "web"] as const;

export type GroundingSourceKind = (typeof GROUNDING_SOURCE_KINDS)[number];

export const GROUNDING_CLAIM_STATUSES = ["grounded", "inference", "conflicted", "unsupported"] as const;

export type GroundingClaimStatus = (typeof GROUNDING_CLAIM_STATUSES)[number];

export interface GroundingSourceFreshness {
  capturedAt: string;
  ageMs: number;
  isFresh: boolean;
}

export interface GroundingSource {
  id: string;
  kind: GroundingSourceKind;
  title: string;
  label: string;
  excerpt: string;
  url?: string | null;
  path?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
  freshness?: GroundingSourceFreshness | null;
}

export interface GroundingClaim {
  id: string;
  text: string;
  sourceIds: string[];
  status: GroundingClaimStatus;
  confidence: AwarenessConfidenceLevel;
}

export interface GroundingConflict {
  id: string;
  description: string;
  sourceIds: string[];
  claimIds: string[];
}

export interface GroundingSourceKindCounts {
  memory: number;
  workspace: number;
  awareness: number;
  official: number;
  web: number;
}

export interface GroundingSummary {
  overallConfidence: AwarenessConfidenceLevel;
  claimCount: number;
  groundedClaimCount: number;
  inferenceClaimCount: number;
  conflictedClaimCount: number;
  unsupportedClaimCount: number;
  usedSourceCount: number;
  unusedSourceCount: number;
  uniqueSourceKindCount: number;
  citationCoverage: number;
  sourceKindCounts: GroundingSourceKindCounts;
  topSourceIds: string[];
}

export interface RetrievalEvalSummary {
  routeReason: string;
  retrievedSourceCount: number;
  usedSourceCount: number;
  unusedSourceCount: number;
  citationCoverage: number;
  unsupportedClaimCount: number;
  conflictedClaimCount: number;
  sourceKindCounts: GroundingSourceKindCounts;
  topSourceIds: string[];
  warnings: string[];
}

export interface GroundingMetadata {
  sources: GroundingSource[];
  claims: GroundingClaim[];
  conflicts: GroundingConflict[];
  summary: GroundingSummary;
  claimExtractionMode?: "default" | "structured" | "deterministic-awareness";
  matchedEvidenceIds?: string[];
  sourceScopeApplied?: ChatReplySourceScope | null;
}

export const toGroundingFreshness = (
  freshness: Pick<FreshnessMetadata, "capturedAt" | "ageMs" | "isFresh"> | null | undefined
): GroundingSourceFreshness | null =>
  freshness
    ? {
        capturedAt: freshness.capturedAt,
        ageMs: freshness.ageMs,
        isFresh: freshness.isFresh
      }
    : null;
