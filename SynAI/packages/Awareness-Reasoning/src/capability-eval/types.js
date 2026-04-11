export const CAPABILITY_CARD_SCHEMA_VERSION = "capability-test-card.v1";
export const GOVERNANCE_EXEC_CARD_SCHEMA_VERSION = "governance-execution-eval-card.v1";
export const CAPABILITY_CARD_SCHEMA_VERSIONS = [
    CAPABILITY_CARD_SCHEMA_VERSION,
    GOVERNANCE_EXEC_CARD_SCHEMA_VERSION
];
export const CAPABILITY_RISK_LEVELS = ["low", "medium", "high", "critical"];
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
];
export const CAPABILITY_PLATFORMS = ["windows", "repo", "document", "general"];
export const CAPABILITY_GAP_TYPES = [
    "missing-knowledge",
    "missing-retrieval",
    "missing-tool",
    "missing-workflow-skill",
    "bad-reasoning-planning",
    "safety-governance-block",
    "ambiguous-prompt-insufficient-context",
    "verifier-limitation"
];
export const CAPABILITY_REMEDIATION_TYPES = [
    "knowledge-pack-update",
    "retrieval-adjustment",
    "tool-exposure",
    "workflow-wrapper",
    "prompt-or-planner-adjustment",
    "safety-expectation-update",
    "test-card-clarification",
    "verifier-improvement"
];
export const CAPABILITY_PATCH_MODES = [
    "proposal-only",
    "sandbox-apply",
    "governed-promotion"
];
