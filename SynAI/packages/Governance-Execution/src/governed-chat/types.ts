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
