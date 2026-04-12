// Phase 6: Unified Request Understanding & Capability Routing types

// 1. RequestFamily
export type RequestFamily =
  | "file"
  | "browser"
  | "process"
  | "service"
  | "registry"
  | "ui"
  | "system"
  | "app"
  | "answer-only"
  | "workflow"
  | "unknown";

// 2. RoutingOutcome
export type RoutingOutcome = "answer" | "act" | "clarify" | "unsupported";

// 3. ExecutorId
export type ExecutorId =
  | "desktop-actions"
  | "workflow-orchestrator"
  | "browser-automation"
  | "service-control"
  | "registry-control"
  | "answer-only"
  | "improvement"
  | "unknown";

// 4. UnsupportedRequestReason
export type UnsupportedRequestReason =
  | "NO_CAPABILITY"
  | "BLOCKED_BY_POLICY"
  | "RISK_TIER_TOO_HIGH"
  | "AMBIGUOUS"
  | "PLUGIN_BLOCKED"
  | "MISSING_CONTEXT"
  | "UNRECOGNIZED";

// 4b. RoutingEscalationDecision (Phase 6: Reasoning escalation policy)
export type RoutingEscalationDecision = 
  | "none"
  | "ambiguous_intent"
  | "low_confidence"
  | "complexity"
  | "capability_gap"
  | "code_architecture";

// 5. CapabilitySource
export type CapabilitySource = "runtime-registry" | "windows-action-adapter" | "plugin" | "builtin";

// 6. CapabilityType
export type CapabilityType = "action" | "executor" | "skill" | "surface";

// 7. RequestIntent
export interface RequestIntent {
  family: RequestFamily;
  label: string;
  signals: string[];
}

// 8. RequestIntentConfidence
export interface RequestIntentConfidence {
  value: number; // 0-1
  rationale: string;
}

// 9. CapabilityMatch
export interface CapabilityMatch {
  capabilityId: string;
  name: string;
  matchConfidence: number;
  matchReason: "alias" | "category" | "intent";
  source: CapabilitySource;
  type: CapabilityType;
}

// 10. CapabilityLookupResult
export interface CapabilityLookupResult {
  matches: CapabilityMatch[];
  unsupportedReason?: UnsupportedRequestReason;
}

// 11. RoutingDecision
export interface RoutingDecision {
  outcome: RoutingOutcome;
  reason?: string;
  clarificationNeeded?: string[];
  actionPlan?: ActionPlan;
}

// 12. ClarificationDecision
export interface ClarificationDecision {
  clarificationNeeded: string[];
  prompt: string;
  fingerprint: string;
}

// 13. UnsupportedClarifyEvent
export interface UnsupportedClarifyEvent {
  eventType: "unsupported" | "clarify";
  requestId: string;
  timestamp: number;
  userText: string;
  detectedIntent: RequestIntent;
  unsupportedReason?: UnsupportedRequestReason;
  clarificationNeeded?: string[];
  fingerprint: string; // hash of (userText + detectedIntent.family + unsupportedReason)
  dedupKey: string;    // same as fingerprint
  rateLimitBucket: string; // e.g. user/session/intent
  rateLimitCount: number;
  improvementCandidate: boolean; // true if event should be queued for improvement analysis
  // Phase 6: Capability-gap proposal fields
  capability_family?: string; // e.g. "calendar", "task_management", "code_execution"
  suggested_tool_area?: string; // e.g. "packages/Desktop-Actions", "plugins/calendar"
  requires_governance_approval?: boolean;
  estimated_complexity?: "trivial" | "small" | "medium" | "complex";
}

// 14. ActionPlan
export interface ActionPlan {
  executor: ExecutorId;
  steps: string[];
  riskTier: string;
  requiresApproval: boolean;
}

// 15. RequestUnderstandingTrace
export interface RequestUnderstandingTrace {
  requestId: string;
  timestamp: number;
  normalizedText: string;
  detectedIntent: RequestIntent;
  intentConfidence: RequestIntentConfidence;
  capabilityLookup: CapabilityLookupResult;
  routingDecision: RoutingDecision;
  contextSummary: string;
  // Phase 6: Reasoning escalation fields
  escalationDecision?: RoutingEscalationDecision;
  escalationReason?: string;
}

// 16. CapabilityGapProposal (Phase 6: Structured capability gap proposal for external consumption)
export interface CapabilityGapProposal {
  capabilityFamily: string; // e.g. "calendar", "task_management", "code_generation"
  userRequest: string;
  detectedIntent: RequestIntent;
  reasonForGap: UnsupportedRequestReason;
  likelyTargetArea: string; // e.g. "packages/Desktop-Actions", "plugins/calendar"
  approvalRequired: boolean;
  timestamp: string;
  requestId: string;
  fromImprovementEventId?: string; // Links back to improvement event
  estimatedComplexity?: "trivial" | "small" | "medium" | "complex";
}
import type {
  ApprovalToken,
  ChatGovernedTaskDecision,
  ChatGovernedTaskExecutor,
  ChatGovernedTaskMetadata,
  ChatGovernedTaskRiskTier,
  DesktopActionProposal,
  DesktopActionRequest,
  DesktopActionResult,
  FileAwarenessSummary,
  MachineAwarenessSnapshot,
  ScreenAwarenessSnapshot,
  WebSearchContext,
  WorkflowExecutionRequest,
  WorkflowExecutionResult,
  WorkflowPlan
} from "@contracts";
import type { ChatMessage } from "@contracts";

export type GovernedTaskDecision = ChatGovernedTaskDecision;
export type GovernedTaskRiskTier = ChatGovernedTaskRiskTier;
export type GovernedTaskExecutor = ChatGovernedTaskExecutor;
export type GovernedTaskMetadata = ChatGovernedTaskMetadata;

export interface GovernedTaskPreflight {
  summary: string;
  checks: string[];
  passed: boolean;
  evidence: string[];
}

export interface GovernedTaskVerification {
  passed: boolean;
  score: number;
  reasons: string[];
  evidence: string[];
  observed_state: unknown;
  expected_state_summary: string;
}

export interface GovernedTaskGapClassification {
  primary_gap: string;
  secondary_gaps: string[];
  why_this_gap_was_chosen: string;
  confidence: number;
  proposed_fix_types: string[];
  rerun_recommendation: string;
}

export interface GovernedTaskRemediationPlan {
  remediation_type: string;
  rationale: string;
  exact_file_targets: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  safe_autofix_allowed: boolean;
  approval_requirement: "none" | "operator-approval";
  patch_summary: string;
  follow_up_tests: string[];
}

export interface GovernedHistoryFinding {
  recovered_intent: string;
  prior_failure_signature: string;
  repeated_request_count: number;
  first_seen: string;
  last_seen: string;
  user_impact_score: number;
  source_conversation_ids: string[];
  latest_user_message: string;
  latest_assistant_message: string | null;
  latest_failure_feedback: string | null;
  suggested_executor: GovernedTaskExecutor;
  suggested_gap: string;
  suggested_eval_card?: Partial<GovernedExecutionEvalCard> | null;
}

export interface GovernedExecutionEvalCard {
  id: string;
  name: string;
  category: string;
  prompt: string;
  platform: "windows" | "repo" | "document" | "general";
  task_type: "inspection" | "safe-action" | "approval-action" | "refusal" | "clarification" | "missing-executor" | "verification" | "rollback";
  action_intent: string;
  expected_governance_decision: GovernedTaskDecision;
  expected_risk_tier: GovernedTaskRiskTier;
  expected_executor: GovernedTaskExecutor;
  expected_preflight: string[];
  expected_verification: string[];
  expected_outcome: string;
  success_definition: string;
  approval_required: boolean;
  safe_autofix_allowed: boolean;
  remediation_options: string[];
  tags: string[];
  priority: number;
  enabled: boolean;
  prerequisites: string[];
  timeout: number;
  notes: string;
}

export interface GovernedTaskPlanRequest {
  requestId: string;
  conversationId: string;
  text: string;
  messages: ChatMessage[];
  workspaceRoot: string;
  desktopPath: string;
  documentsPath: string;
  machineAwareness: MachineAwarenessSnapshot | null;
  fileAwareness: FileAwarenessSummary | null;
  screenAwareness: ScreenAwarenessSnapshot | null;
  recentWebContext: WebSearchContext | null;
}

export interface GovernedTaskPlanResult {
  requestId: string;
  conversationId: string;
  normalizedText: string;
  decision: GovernedTaskDecision;
  actionType: string | null;
  riskTier: GovernedTaskRiskTier;
  requiresExecution: boolean;
  approvalRequired: boolean;
  approvalReason: string | null;
  denialReason: string | null;
  clarificationNeeded: string[];
  executionAllowed: boolean;
  verificationRequired: boolean;
  recommendedExecutor: GovernedTaskExecutor;
  policyRulesTriggered: string[];
  reasoningSummary: string;
  approvalState: {
    pending: boolean;
    reason: string | null;
    tokenId: string | null;
    approver: string | null;
    expiresAt: string | null;
  };
  plan: WorkflowPlan | null;
  desktopAction: DesktopActionProposal | null;
  workflowRequest: WorkflowExecutionRequest | null;
  desktopRequest: DesktopActionRequest | null;
  artifacts: Record<string, unknown>;
}

export interface GovernedTaskExecutionResult {
  requestId: string;
  conversationId: string;
  decision: GovernedTaskDecision;
  executor: GovernedTaskExecutor;
  approvalToken: ApprovalToken | null;
  approvalRequired: boolean;
  approvedBy: string | null;
  executionAllowed: boolean;
  summary: string;
  taskMetadata: GovernedTaskMetadata;
  executionResult: WorkflowExecutionResult | DesktopActionResult | null;
  verification: GovernedTaskVerification | null;
  gap: GovernedTaskGapClassification | null;
  remediation: GovernedTaskRemediationPlan | null;
  artifacts: Record<string, unknown>;
}
