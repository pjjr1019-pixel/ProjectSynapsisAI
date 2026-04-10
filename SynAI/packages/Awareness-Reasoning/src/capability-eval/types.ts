import type { AwarenessQueryAnswer } from "../contracts/awareness";
import type { ApprovalToken, RiskClass } from "@governance-execution";

export const CAPABILITY_CARD_SCHEMA_VERSION = "capability-test-card.v1" as const;
export const GOVERNANCE_EXEC_CARD_SCHEMA_VERSION = "governance-execution-eval-card.v1" as const;
export const CAPABILITY_CARD_SCHEMA_VERSIONS = [
  CAPABILITY_CARD_SCHEMA_VERSION,
  GOVERNANCE_EXEC_CARD_SCHEMA_VERSION
] as const;

export const CAPABILITY_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type CapabilityRiskLevel = RiskClass;

export const CAPABILITY_VERIFIER_TYPES = [
  "exact-match",
  "substring-regex",
  "json-field",
  "source-grounding",
  "workflow-tool-selection",
  "file-diff",
  "command-action-selection",
  "action-sequence",
  "action-preconditions",
  "action-risk-class",
  "action-approval-token",
  "governance-decision",
  "executor-selection",
  "preflight-check",
  "verification-state",
  "approval-state",
  "rollback-state",
  "policy-refusal",
  "custom-hook"
] as const;
export type CapabilityVerifierType = (typeof CAPABILITY_VERIFIER_TYPES)[number];

export const CAPABILITY_PLATFORMS = ["windows", "repo", "document", "general"] as const;
export type CapabilityPlatform = (typeof CAPABILITY_PLATFORMS)[number];

export interface CapabilityRetryPolicy {
  maxAttempts: number;
  retryDelayMs: number;
}

export interface CapabilityContextRequirement {
  id: string;
  source:
    | "awareness.live-usage"
    | "awareness.resource-hotspot"
    | "awareness.settings-map"
    | "awareness.general"
    | "workspace.file"
    | "workspace.search"
    | "inline";
  query?: string;
  path?: string;
  value?: string;
  maxChars?: number;
}

export interface CapabilityTestCard {
  schema_version: (typeof CAPABILITY_CARD_SCHEMA_VERSIONS)[number];
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  success_definition: string;
  allowed_tools: string[];
  forbidden_tools: string[];
  required_context: CapabilityContextRequirement[];
  optional_context: CapabilityContextRequirement[];
  verifier_type: CapabilityVerifierType;
  verifier_config: Record<string, unknown>;
  remediation_options: string[];
  risk_level: CapabilityRiskLevel;
  approval_required: boolean;
  retry_policy: CapabilityRetryPolicy;
  tags: string[];
  enabled: boolean;
  priority: number;
  platform?: CapabilityPlatform;
  environment_preconditions?: string[];
  regression_group?: string | null;
  prerequisite_tests?: string[];
  timeout_ms?: number;
  expected_artifacts?: string[];
  task_type?: "inspection" | "safe-action" | "approval-action" | "refusal" | "clarification" | "missing-executor" | "verification" | "rollback";
  action_intent?: string;
  expected_governance_decision?: "allow" | "allow_with_verification" | "require_approval" | "deny" | "clarify" | "plan_only";
  expected_risk_tier?: RiskClass;
  expected_executor?: string;
  expected_preflight?: string[];
  expected_verification?: string[];
  expected_outcome?: string;
  safe_autofix_allowed?: boolean;
  prerequisites?: string[];
  timeout?: number;
  notes?: string;
}

export interface CapabilityContextEvidence {
  id: string;
  source: CapabilityContextRequirement["source"];
  summary: string;
  payload: unknown;
  missing: boolean;
}

export interface CapabilityContextBundle {
  required: CapabilityContextEvidence[];
  optional: CapabilityContextEvidence[];
  missingRequired: CapabilityContextEvidence[];
  retrievalStats: {
    requiredResolved: number;
    requiredMissing: number;
    optionalResolved: number;
  };
}

export interface CapabilityActionProposal {
  id: string;
  action: string;
  commandPreview: string;
  riskLevel: CapabilityRiskLevel;
  riskClass?: CapabilityRiskLevel;
  approvalRequired: boolean;
  preconditions?: string[];
}

export interface LocalAiEvalOutput {
  interpreted_task: string;
  plan: string[];
  selected_tools_or_workflows: string[];
  answer_or_action: {
    mode: "answer" | "action" | "refusal";
    text: string;
    proposed_actions?: CapabilityActionProposal[];
  };
  confidence: number;
  reasoning_summary: string;
  missing_information: string[];
  safety_flags: string[];
  artifacts: Record<string, unknown>;
}

export interface LocalAiEvalRequestArtifact {
  prompt: string;
  systemPrompt: string;
  context: CapabilityContextBundle;
  allowedTools: string[];
  forbiddenTools: string[];
  cardId: string;
  approvalTokenProvided: boolean;
  approvedBy: string | null;
}

export interface LocalAiEvalExecutionResult {
  request: LocalAiEvalRequestArtifact;
  rawResponseText: string;
  output: LocalAiEvalOutput;
  awarenessAnswer: AwarenessQueryAnswer | null;
}

export interface CapabilityVerifierResult {
  passed: boolean;
  score: number;
  reasons: string[];
  evidence: string[];
  observed_output: unknown;
  expected_output_summary: string;
}

export const CAPABILITY_GAP_TYPES = [
  "missing-knowledge",
  "missing-retrieval",
  "missing-tool",
  "missing-workflow-skill",
  "bad-reasoning-planning",
  "safety-governance-block",
  "ambiguous-prompt-insufficient-context",
  "verifier-limitation"
] as const;
export type CapabilityGapType = (typeof CAPABILITY_GAP_TYPES)[number];

export interface CapabilityGapClassification {
  primary_gap: CapabilityGapType;
  secondary_gaps: CapabilityGapType[];
  why_this_gap_was_chosen: string;
  confidence: number;
  recommended_next_actions: string[];
}

export const CAPABILITY_REMEDIATION_TYPES = [
  "knowledge-pack-update",
  "retrieval-adjustment",
  "tool-exposure",
  "workflow-wrapper",
  "prompt-or-planner-adjustment",
  "safety-expectation-update",
  "test-card-clarification",
  "verifier-improvement"
] as const;
export type CapabilityRemediationType = (typeof CAPABILITY_REMEDIATION_TYPES)[number];

export interface CapabilityPatchInstruction {
  kind: "card-json-merge" | "retrieval-hint-merge";
  target: string;
  merge: Record<string, unknown>;
}

export interface CapabilityRemediationPlan {
  remediation_type: CapabilityRemediationType;
  rationale: string;
  concrete_file_targets: string[];
  proposed_patch_summary: string;
  risk_level: CapabilityRiskLevel;
  approval_requirement: "none" | "operator-approval";
  follow_up_tests_to_rerun: string[];
  auto_patch?: CapabilityPatchInstruction | null;
}

export const CAPABILITY_PATCH_MODES = [
  "proposal-only",
  "sandbox-apply",
  "governed-promotion"
] as const;
export type CapabilityPatchMode = (typeof CAPABILITY_PATCH_MODES)[number];

export interface CapabilityApprovalRecord {
  mode: CapabilityPatchMode;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  reason: string | null;
}

export interface CapabilitySandboxResult {
  sandboxRoot: string;
  applied: boolean;
  appliedFiles: string[];
  diffSummary: string;
  rerunResult: CapabilityVerifierResult | null;
  promoted: boolean;
  promotionSummary: string | null;
  governanceCommandIds?: string[];
  governanceAuditPath?: string | null;
}

export interface CapabilityRunCycleResult {
  cardId: string;
  status: "passed" | "failed";
  startedAt: string;
  completedAt: string;
  execution: LocalAiEvalExecutionResult | null;
  verifier: CapabilityVerifierResult | null;
  gap: CapabilityGapClassification | null;
  remediation: CapabilityRemediationPlan | null;
  sandbox: CapabilitySandboxResult | null;
  artifactDir: string;
}

export interface CapabilityRunSummary {
  runId: string;
  startedAt: string;
  completedAt: string;
  mode: CapabilityPatchMode;
  dryRun: boolean;
  totals: {
    total: number;
    passed: number;
    failed: number;
  };
  cardResults: CapabilityRunCycleResult[];
}

export interface CapabilityRunnerOptions {
  cardsRoot: string;
  artifactsRoot: string;
  workspaceRoot: string;
  mode: CapabilityPatchMode;
  dryRun: boolean;
  proposalOnly: boolean;
  autoRemediate: boolean;
  approvedBy?: string;
  approvalToken?: ApprovalToken | null;
  rerunAfterRemediation: boolean;
}
