/**
 * Improvement System Contracts
 * 
 * Types for analyzing user prompts and assistant replies to detect improvement opportunities.
 * Events flow through: analyzer → queue → planner → appliers (memory, reply-policy, patch proposals).
 */

export type ImprovementEventType =
  | "memory_candidate"
  | "weak_reply"
  | "capability_gap"
  | "tool_failure"
  | "feature_request"
  | "needs_review";

export type ImprovementRecommendation =
  | "update_memory"
  | "update_reply_policy"
  | "create_feature_plan"
  | "create_patch_proposal"
  | "escalate"
  | "ignore"
  | "defer";

export type ImprovementEventStatus =
  | "detected"       // Analyzer created it
  | "queued"         // In event queue
  | "analyzed"       // Planner processed it
  | "proposed"       // Proposal generated but not applied
  | "applied"        // Action taken (memory added, reply-policy rule appended, etc.)
  | "approved"       // Governance approved (for patches)
  | "rejected"       // User rejected
  | "dismissed";     // User dismissed

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ImprovementEventPayload {
  /** Normalized hash of prompt for deduplication */
  fingerprint: string;
  
  /** Until when this event is in cooldown (ISO string) */
  cooldownUntil: string;
  
  /** Number of repeated similar events */
  repeatCount: number;
  
  /** ID of the last similar event (for tracing) */
  lastSimilarEventId?: string;
  
  /** From analyzer: extracted metadata */
  [key: string]: unknown;
}

export interface ImprovementEvent {
  id: string;
  type: ImprovementEventType;
  recommendation: ImprovementRecommendation;
  risk: RiskLevel;
  status: ImprovementEventStatus;
  
  /** Structured event data (fingerprint, cooldown, repeat-count, etc.) */
  payload: ImprovementEventPayload;
  
  /** Tracing context */
  sourceConversationId?: string;
  userPromptExcerpt: string;
  assistantReplyExcerpt: string;
  
  /** When detected */
  createdAt: string;
  
  /** Last status update */
  updatedAt: string;
  
  /** Optional: metadata about why it was recommended */
  reasoning?: string;
}

/**
 * Patch proposals are first-class artifacts stored in the queue.
 * They represent potential code changes that could fix a capability gap or improve behavior.
 */
export type PatchProposalScope = "scaffold" | "small_ui" | "small_tool_wrapper";
export type PatchProposalStatus = "drafted" | "proposed" | "approved" | "rejected" | "applied";
export type PatchProposalEffort = "tiny" | "small" | "medium";

export interface PatchProposal {
  id: string;
  
  /** Which improvement event triggered this proposal */
  fromImprovementEventId: string;
  
  /** Files that might need changes */
  targetFiles: string[];
  
  /** Rough estimate of lines to change */
  estimatedLinesChanged: number;
  
  /** Rough scope classification */
  scope: PatchProposalScope;
  risk: RiskLevel;
  estimatedEffort: PatchProposalEffort;
  
  /** Steps to verify this patch works */
  testPlan: string[];
  
  /** Optional: pseudocode or placeholder code */
  codeSketch?: string;
  
  /** Is governance approval required? */
  approvalRequired: boolean;
  
  status: PatchProposalStatus;
  createdAt: string;
  appliedAt?: string;
  
  /** Tracing */
  reasoning?: string;
}

/**
 * Reply-policy rules guide fallback replies when the AI cannot fulfill a request.
 * Stored in two layers: canonical (source-controlled) + runtime overlay (generated, local-only).
 */
export interface ReplyPolicyRule {
  id: string;
  
  /** Category for grouping rules (e.g., "calendar_missing", "time_tracking_gap") */
  category: string;
  
  /** When to apply: user request pattern or AI response pattern */
  condition: string;
  
  /** Better fallback to use instead of weak reply */
  fallbackReply: string;
  
  risk: RiskLevel;
  enabled: boolean;
  
  /** "canonical" (source-controlled) or "improvement-analyzer" (auto-generated) */
  source: "canonical" | "improvement-analyzer" | "manual";
  
  /** If source is "improvement-analyzer", which event generated this? */
  generatedFromEventId?: string;
  
  createdAt: string;
}

/**
 * Analyzer detects improvement candidates; returns a list of events to queue.
 */
export interface AnalyzerInput {
  /** Current user prompt */
  userPrompt: string;
  
  /** Assistant's response text */
  assistantReply: string;
  
  /** Metadata about how the response was generated */
  replyMetadata?: {
    model: string;
    modelClass?: "general" | "code" | "vision" | "embedding";
    durationMs: number;
    usedMemory: boolean;
    usedWebSearch: boolean;
    usedWorkspace: boolean;
    warnings?: string[];
  };
  
  /** Optional: recent conversation for context (last 2 messages) */
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  
  /** Optional: were similar requests made recently? */
  priorRequestCount?: number;
}

export interface AnalyzerOutput {
  events: ImprovementEvent[];
}

/**
 * Planner consumes queued events and routes them to actions.
 */
export interface PlannerInput {
  event: ImprovementEvent;
}

export interface PlannerAction {
  type: ImprovementRecommendation;
  event: ImprovementEvent;
  targetMemoryCategory?: string;
  replyPolicyRule?: ReplyPolicyRule;
  patchProposal?: PatchProposal;
  reasoning?: string;
}

export interface PlannerOutput {
  actions: PlannerAction[];
  updatedEvent: ImprovementEvent;
}
