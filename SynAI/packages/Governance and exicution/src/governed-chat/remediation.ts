import type { GovernedTaskGapClassification } from "./gap-classifier";
import type { GovernedTaskPlanResult, GovernedTaskRemediationPlan } from "./types";

export interface GovernedTaskRemediationInput {
  route: GovernedTaskPlanResult;
  gap: GovernedTaskGapClassification;
}

const basePlan = (input: GovernedTaskRemediationInput): GovernedTaskRemediationPlan => ({
  remediation_type: input.gap.primary_gap,
  rationale: input.gap.why_this_gap_was_chosen,
  exact_file_targets: [],
  risk_level: "medium",
  safe_autofix_allowed: false,
  approval_requirement: "operator-approval",
  patch_summary: "Inspect artifacts and apply the smallest safe fix.",
  follow_up_tests: []
});

export const planGovernedTaskRemediation = (
  input: GovernedTaskRemediationInput
): GovernedTaskRemediationPlan => {
  const { gap, route } = input;

  switch (gap.primary_gap) {
    case "missing_intent_parser_rule":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/apps/desktop/electron/governed-chat/router.ts",
          "SynAI/tests/governance/governed-chat-router.test.ts"
        ],
        risk_level: "low",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Add a deterministic task-routing rule and a regression test.",
        follow_up_tests: ["governance-chat-router", "governed-task-replay"]
      };
    case "ambiguous_intent":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/apps/desktop/electron/governed-chat/router.ts",
          "SynAI/tests/governance/governed-chat-router.test.ts"
        ],
        risk_level: "low",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Add target clarification logic and ambiguity tests.",
        follow_up_tests: ["governance-chat-router", "governed-task-clarification"]
      };
    case "missing_governance_rule":
    case "incorrect_governance_decision":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Governance and exicution/src/governed-chat/router.ts",
          "SynAI/packages/Governance and exicution/src/policy/engine.ts",
          "SynAI/tests/governance/policy-engine.test.ts"
        ],
        risk_level: "medium",
        safe_autofix_allowed: false,
        approval_requirement: "operator-approval",
        patch_summary: "Tighten risk-tier mapping and policy rule selection.",
        follow_up_tests: ["policy-engine", "governance-chat-router"]
      };
    case "missing_executor":
    case "incorrect_executor_selection":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Governance and exicution/src/governed-chat/router.ts",
          "SynAI/apps/desktop/electron/main.ts",
          "SynAI/apps/desktop/electron/workflow-orchestrator.ts",
          "SynAI/apps/desktop/electron/desktop-actions.ts"
        ],
        risk_level: "high",
        safe_autofix_allowed: false,
        approval_requirement: "operator-approval",
        patch_summary: "Wire the missing executor path or correct executor routing.",
        follow_up_tests: ["governed-task-routing", "desktop-actions", "workflow-orchestrator"]
      };
    case "missing_preflight_check":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Governance and exicution/src/governed-chat/verification.ts"
        ],
        risk_level: "medium",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Add preflight validation before execution.",
        follow_up_tests: ["governed-task-verifier"]
      };
    case "missing_verifier":
    case "failed_verification_logic":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Governance and exicution/src/governed-chat/verification.ts",
          "SynAI/tests/governance/governed-task-verifier.test.ts"
        ],
        risk_level: "low",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Add or repair the deterministic post-execution verifier.",
        follow_up_tests: ["governed-task-verifier", "governed-task-routing"]
      };
    case "execution_runtime_failure":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/apps/desktop/electron/desktop-actions.ts",
          "SynAI/apps/desktop/electron/workflow-orchestrator.ts",
          "SynAI/apps/desktop/electron/browser-session.ts"
        ],
        risk_level: "high",
        safe_autofix_allowed: false,
        approval_requirement: "operator-approval",
        patch_summary: "Fix the runtime executor that failed and rerun the same prompt.",
        follow_up_tests: ["desktop-actions", "workflow-orchestrator", "browser-session"]
      };
    case "missing_rollback":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Governance and exicution/src/governed-chat/verification.ts",
          "SynAI/packages/Governance and exicution/src/governed-chat/remediation.ts"
        ],
        risk_level: "medium",
        safe_autofix_allowed: false,
        approval_requirement: "operator-approval",
        patch_summary: "Add rollback metadata or mark the task path as non-reversible.",
        follow_up_tests: ["governed-task-verifier"]
      };
    case "missing_knowledge_retrieval":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Awareness-Reasoning/src/governance-history/miner.ts",
          "SynAI/packages/Awareness-Reasoning/src/memory/index.ts",
          "SynAI/capability/retrieval/index-hints.json"
        ],
        risk_level: "low",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Seed retrieval and memory hints for the missing knowledge path.",
        follow_up_tests: ["governance-history-miner", "capability-retrieval"]
      };
    case "missing_workflow_wrapper":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/apps/desktop/electron/workflow-planner.ts",
          "SynAI/apps/desktop/electron/workflow-orchestrator.ts",
          "SynAI/tests/governance/governed-task-routing.test.ts"
        ],
        risk_level: "medium",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Add a deterministic workflow wrapper for the task family.",
        follow_up_tests: ["workflow-planner", "workflow-orchestrator", "governed-task-routing"]
      };
    case "approval_state_issue":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/apps/desktop/electron/main.ts",
          "SynAI/packages/Governance and exicution/src/approvals/ledger.ts",
          "SynAI/tests/governance/approval-ledger.test.ts"
        ],
        risk_level: "medium",
        safe_autofix_allowed: false,
        approval_requirement: "operator-approval",
        patch_summary: "Fix approval issuance / validation or state propagation.",
        follow_up_tests: ["approval-ledger", "governance-chat-approval"]
      };
    case "missing_history_replay_rule":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/packages/Awareness-Reasoning/src/governance-history/miner.ts",
          "SynAI/apps/desktop/electron/main.ts",
          "SynAI/tests/governance/governance-history-miner.test.ts"
        ],
        risk_level: "low",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Teach the system to replay local failed tasks from history.",
        follow_up_tests: ["governance-history-miner", "governed-task-routing"]
      };
    case "test_card_defect":
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/capability/cards/governance-exec/*.json",
          "SynAI/tests/governance/*.test.ts"
        ],
        risk_level: "low",
        safe_autofix_allowed: true,
        approval_requirement: "none",
        patch_summary: "Fix the eval card or verifier contract instead of changing the runtime.",
        follow_up_tests: ["governance-exec-cards", "governance-eval-runner"]
      };
    default:
      return {
        ...basePlan(input),
        exact_file_targets: [
          "SynAI/apps/desktop/electron/main.ts",
          "SynAI/packages/Governance and exicution/src/governed-chat/router.ts"
        ],
        risk_level: "medium",
        safe_autofix_allowed: false,
        approval_requirement: "operator-approval",
        patch_summary: route.actionType ? `Inspect the ${route.actionType} path and tighten the missing contract.` : "Inspect the route and tighten the missing contract.",
        follow_up_tests: ["governed-task-routing"]
      };
  }
};

