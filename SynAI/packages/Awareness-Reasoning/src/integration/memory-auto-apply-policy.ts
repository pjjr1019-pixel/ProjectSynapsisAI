/**
 * Memory Auto-Apply Policy Engine
 *
 * Strict, conservative policy for auto-applying memory candidates detected by the analyzer.
 *
 * Phase 5: Narrow Memory Auto-Apply
 * - Only auto-apply high-confidence preference and durable personal_fact entries
 * - Reject sensitive content (medical, financial, political, etc.)
 * - Reject temporary/transient content
 * - All other categories deferred for future phases
 */

import type { MemoryCategory } from "@contracts/memory";
import { listMemories } from "../memory/storage/memories";

export type MemoryAutoApplyDecision = "apply" | "reject" | "defer";

export interface MemoryAutoApplyResult {
  decision: MemoryAutoApplyDecision;
  reason: string;
  metadata?: {
    category?: MemoryCategory;
    confidence?: number;
    riskLevel?: string;
    dedupeMatch?: string;
    durabilityScore?: number;
    hasSensitiveContent?: boolean;
    // Phase 5: Decision classification for UI display
    failedGate?: string;  // Which gate rejected/deferred (e.g., "confidence_threshold", "durability_check")
    gateDetails?: string;  // Human-readable gate+details (e.g., "confidence gate: 0.6 < 0.8")
  };
}

export interface MemoryCandidateInput {
  text: string;
  category: MemoryCategory;
  confidence?: number;
  risk: "low" | "medium" | "high";
  sourceConversationId?: string;
  sourceEventId?: string;
}

/**
 * Phase 5: Allowlist categories for auto-apply.
 * Conservative scope: only preference and carefully vetted personal_fact.
 */
const ALLOWED_CATEGORIES_PHASE_5: MemoryCategory[] = ["preference", "personal_fact"];

/**
 * Keywords indicating durable, stable content.
 */
const DURABILITY_KEYWORDS = [
  "always",
  "prefer",
  "usually",
  "typically",
  "general",
  "default",
  "permanent",
  "stable",
  "consistent",
  "standard",
  "generally"
];

/**
 * Keywords indicating temporary, time-bound content.
 */
const TEMPORAL_KEYWORDS = [
  "today",
  "tomorrow",
  "this week",
  "next week",
  "next monday",
  "soon",
  "later",
  "temporary",
  "try",
  "maybe",
  "might",
  "consider"
];

/**
 * Keywords indicating sensitive content requiring manual review.
 */
const SENSITIVE_KEYWORDS = [
  "medical",
  "health",
  "doctor",
  "disease",
  "medication",
  "therapy",
  "mental health",
  "financial",
  "bank",
  "credit",
  "salary",
  "income",
  "loan",
  "political",
  "religion",
  "religious",
  "belief",
  "intimate",
  "private",
  "secret",
  "password",
  "key"
];

/**
 * Calculate durability score (0-1) based on content keywords.
 * Higher score = more likely to be durable, stable content.
 */
function calculateDurability(text: string): number {
  const lower = text.toLowerCase();
  const durabilityMatches = DURABILITY_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const temporalMatches = TEMPORAL_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  if (temporalMatches > 0) {
    // Temporal keywords dampen the score
    return Math.min(0.4, 0.3 + durabilityMatches * 0.08);
  }

  // Base score + boost per durability keyword
  return Math.min(1.0, 0.5 + durabilityMatches * 0.15);
}

/**
 * Check if text contains sensitive keywords.
 */
function hasSensitiveKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Check for exact duplicate in existing memory.
 * 
 * Phase 5: EXACT-MATCH ONLY
 * - Compares normalized text (lowercase, trim)
 * - Simple string equality check
 * - Prevents identical memories from being stored twice
 * 
 * Phase 6+: FUZZY/SEMANTIC DEDUPE DEFERRED
 * Fuzzy matching capabilities NOT implemented in Phase 5:
 * - Fuzzy string matching (Levenshtein, Jaro-Winkler, etc.)
 * - Semantic similarity via embeddings
 * - Abbreviation/acronym expansion
 * - Word-order-independent matching
 * 
 * Deferral rationale: Fuzzy matching would require additional ML dependencies,
 * higher CPU cost, and careful threshold tuning to avoid false positives.
 * Phase 5 prioritizes narrow, high-confidence auto-apply with conservative deduplication.
 * Fuzzy dedupe will be reconsidered in Phase 6+ if memory growth or user feedback warrants it.
 * 
 * Normalizes text (lowercase, trim) for comparison.
 */
async function checkExactDuplicate(text: string): Promise<string | null> {
  try {
    const normalized = text.toLowerCase().trim();
    const existing = await listMemories();

    for (const memory of existing) {
      const existingNorm = memory.text.toLowerCase().trim();
      if (normalized === existingNorm) {
        return memory.id;
      }
    }

    return null;
  } catch (err) {
    console.warn("[Memory Policy] Dedupe check failed:", err);
    return null;
  }
}

/**
 * Main policy evaluation function.
 * Returns decision (apply/reject/defer) with reasoning.
 */
export async function evaluateMemoryAutoApply(
  candidate: MemoryCandidateInput
): Promise<MemoryAutoApplyResult> {
  // Check 1: Category allowlist
  if (!ALLOWED_CATEGORIES_PHASE_5.includes(candidate.category)) {
    return {
      decision: "reject",
      reason: `Category '${candidate.category}' not in allowlist (Phase 5 only allows preference and filtered personal_fact)`,
      metadata: {
        failedGate: "category_allowlist",
        gateDetails: `Category '${candidate.category}' not allowed in Phase 5`,
        category: candidate.category
      }
    };
  }

  // Check 2: Confidence threshold (default 0.5 if not provided)
  const confidence = candidate.confidence ?? 0.5;
  if (confidence < 0.8) {
    return {
      decision: "reject",
      reason: `Confidence ${confidence.toFixed(2)} below threshold 0.8`,
      metadata: { 
        confidence,
        failedGate: "confidence_threshold",
        gateDetails: `Confidence ${confidence.toFixed(2)} < 0.8`
      }
    };
  }

  // Check 3: Risk level
  if (candidate.risk !== "low") {
    return {
      decision: "reject",
      reason: `Risk level '${candidate.risk}' is not low`,
      metadata: { 
        riskLevel: candidate.risk,
        failedGate: "risk_level",
        gateDetails: `Risk '${candidate.risk}' is not low`
      }
    };
  }

  // Check 4: Transience check
  const lower = candidate.text.toLowerCase();
  const hasTemporalKeywords = TEMPORAL_KEYWORDS.some((kw) => lower.includes(kw));
  if (hasTemporalKeywords) {
    return {
      decision: "defer",
      reason: "Content appears time-bound; deferring to ensure durability",
      metadata: { 
        category: candidate.category, 
        confidence,
        failedGate: "transience_check",
        gateDetails: "Contains temporal keywords; content may not be durable"
      }
    };
  }

  // Check 5: Personal_fact specific gates
  if (candidate.category === "personal_fact") {
    // Check for sensitive content
    if (hasSensitiveKeywords(candidate.text)) {
      return {
        decision: "defer",
        reason: "Personal fact contains sensitive content; deferring for manual review",
        metadata: { 
          category: candidate.category, 
          confidence, 
          hasSensitiveContent: true,
          failedGate: "sensitive_keywords",
          gateDetails: "Personal fact contains sensitive keywords; requires manual review"
        }
      };
    }

    // Check durability score
    const durabilityScore = calculateDurability(candidate.text);
    if (durabilityScore < 0.7) {
      return {
        decision: "defer",
        reason: `Personal fact not clearly durable (score ${durabilityScore.toFixed(2)} < 0.7); deferring for later`,
        metadata: { 
          category: candidate.category, 
          confidence, 
          durabilityScore,
          failedGate: "durability_threshold",
          gateDetails: `Durability score ${durabilityScore.toFixed(2)} < 0.7`
        }
      };
    }
  }

  // Check 6: Exact dedupe check
  const dedupeMatch = await checkExactDuplicate(candidate.text);
  if (dedupeMatch) {
    return {
      decision: "reject",
      reason: `Exact duplicate of existing memory '${dedupeMatch}'`,
      metadata: { 
        category: candidate.category, 
        confidence, 
        dedupeMatch,
        failedGate: "exact_duplicate",
        gateDetails: "Exact text already in memory store"
      }
    };
  }

  // All checks passed!
  return {
    decision: "apply",
    reason: "All checks passed; auto-applying",
    metadata: { 
      category: candidate.category, 
      confidence,
      failedGate: undefined,
      gateDetails: "All gates passed; applying memory"
    }
  };
}
