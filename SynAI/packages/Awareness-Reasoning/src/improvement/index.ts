// Queue operations
export {
  insertImprovementEvent,
  queryImprovementEvents,
  updateImprovementEventStatus,
  getImprovementEventById,
  getEventsByStatus,
  getReadyToProcessEvents,
  markEventAsQueued,
  getEventCountsByType,
  getEventCountsByStatus,
  getDetectedCapabilityFamilies,
  getCapabilityGapProposalsForReview,
  getImprovementPipelineSnapshot
} from "./queue";

// Analyzer operations
export { analyzePromptReply, analyzeBatch, analyzeUnsupportedClarifyEvent } from "./analyzer";

// Planner operations
export {
  planImprovementEvent,
  planAllQueuedEvents,
  getPlanningStats,
  exportCapabilityGapProposals,
  queryCapabilityGapProposalsByFamily
} from "./planner";

// Reply-policy operations (re-exported for convenience)
export {
  addGeneratedReplyPolicyRule,
  getActiveReplyPolicies,
  findApplicablePolicy,
  getReplyPolicyStats,
  resetOverlay,
  exportActiveRules
} from "../reply-policies";

// Re-export types
export type {
  ImprovementEvent,
  ImprovementEventType,
  ImprovementRecommendation,
  ImprovementEventStatus,
  RiskLevel,
  ImprovementEventPayload,
  AnalyzerInput,
  AnalyzerOutput,
  PlannerInput,
  PlannerOutput,
  PlannerAction,
  PatchProposal,
  ReplyPolicyRule
} from "@contracts/improvement";
