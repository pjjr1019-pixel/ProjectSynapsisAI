const normalize = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const unique = (values) => [...new Set(values)];
const hasFailureText = (text, needles) => {
    const normalized = normalize(text);
    return needles.some((needle) => normalized.includes(normalize(needle)));
};
export const classifyGovernedTaskGap = (input) => {
    const failureText = input.failureText ?? "";
    const route = input.route;
    const verification = input.verification;
    const executionResult = input.executionResult;
    const secondary = [];
    let primary = "execution_runtime_failure";
    let rationale = "Defaulted to execution/runtime failure.";
    let confidence = 0.55;
    if (route.decision === "clarify" && route.clarificationNeeded.length > 0) {
        primary = "ambiguous_intent";
        rationale = "The route requested clarification because the user target was ambiguous.";
        confidence = 0.96;
    }
    else if (route.actionType === "history-replay") {
        primary = "missing_history_replay_rule";
        rationale = "The task was recovered from local history, so the backlog needs a replay-specific rule.";
        confidence = 0.83;
    }
    else if (route.decision === "deny") {
        primary = "missing_governance_rule";
        rationale = "The router denied the request, indicating a missing or too-strict policy rule.";
        confidence = 0.8;
    }
    else if (route.decision === "plan_only" && route.actionType === "history-replay") {
        primary = "missing_history_replay_rule";
        rationale = "History replay was recognized but not yet routable to execution.";
        confidence = 0.79;
    }
    else if (!route.executionAllowed && route.requiresExecution) {
        primary = route.approvalRequired ? "approval_state_issue" : "missing_governance_rule";
        rationale = route.approvalRequired
            ? "Execution was blocked by missing approval state."
            : "Execution was expected but governance did not allow it.";
        confidence = 0.84;
    }
    else if (!executionResult) {
        primary = route.recommendedExecutor === "workflow-orchestrator" ? "missing_workflow_wrapper" : "missing_executor";
        rationale = "No executor produced a result for this task.";
        confidence = 0.9;
    }
    else if (verification.passed) {
        primary = "test_card_defect";
        rationale = "The execution succeeded and verification passed, so the card or route is likely the issue.";
        confidence = 0.72;
    }
    else if (executionResult && "status" in executionResult && executionResult.status === "failed") {
        primary = "execution_runtime_failure";
        rationale = "The executor returned a failed result.";
        confidence = 0.91;
    }
    else if (!route.approvalRequired && route.riskTier === "tier-3") {
        primary = "incorrect_governance_decision";
        rationale = "A high-risk task reached execution without approval gating.";
        confidence = 0.82;
    }
    else if (route.recommendedExecutor === "answer-only" && route.requiresExecution) {
        primary = "missing_intent_parser_rule";
        rationale = "The router misread a task-like prompt as answer-only.";
        confidence = 0.88;
    }
    else if (route.recommendedExecutor !== "answer-only" && route.actionType === "answer-only") {
        primary = "incorrect_executor_selection";
        rationale = "The task was routed to the wrong executor family.";
        confidence = 0.84;
    }
    else if (route.recommendedExecutor === "workflow-orchestrator" && route.plan === null && route.actionType === "workflow") {
        primary = "missing_workflow_wrapper";
        rationale = "The route needs a workflow wrapper but only raw execution details were present.";
        confidence = 0.81;
    }
    else if (hasFailureText(failureText, ["verification", "verify", "expected", "observed"]) ||
        verification.reasons.some((reason) => hasFailureText(reason, ["verification", "expected", "observed"]))) {
        primary = "failed_verification_logic";
        rationale = "The run executed but verification logic did not agree with the observed state.";
        confidence = 0.87;
    }
    else {
        primary = verification.passed ? "test_card_defect" : "execution_runtime_failure";
        rationale = verification.passed
            ? "The overall flow succeeded, so the regression is likely in the test card."
            : "The flow failed without a narrower classification signal.";
        confidence = 0.58;
    }
    if (route.clarificationNeeded.length > 0 && primary !== "ambiguous_intent") {
        secondary.push("ambiguous_intent");
    }
    if (route.approvalRequired && primary !== "approval_state_issue") {
        secondary.push("approval_state_issue");
    }
    if (route.recommendedExecutor === "workflow-orchestrator" && primary !== "missing_workflow_wrapper") {
        secondary.push("missing_workflow_wrapper");
    }
    if (route.recommendedExecutor === "answer-only" && route.requiresExecution && primary !== "missing_intent_parser_rule") {
        secondary.push("missing_intent_parser_rule");
    }
    const proposedFixTypes = (() => {
        switch (primary) {
            case "missing_intent_parser_rule":
                return ["add router heuristic", "add router test", "add evaluator card"];
            case "ambiguous_intent":
                return ["add clarification prompt", "improve target extraction", "add ambiguity eval card"];
            case "missing_governance_rule":
                return ["add policy rule", "add approval mapping", "add regression test"];
            case "incorrect_governance_decision":
                return ["tighten risk tier mapping", "fix allow/deny threshold", "add policy test"];
            case "missing_executor":
                return ["add executor adapter", "wire dispatcher", "add smoke test"];
            case "incorrect_executor_selection":
                return ["adjust executor routing", "refine intent classifier", "add selection test"];
            case "missing_preflight_check":
                return ["add preflight validation", "add path/process existence checks", "add preflight test"];
            case "missing_verifier":
                return ["add post-execution verifier", "add state assertions", "add verification test"];
            case "failed_verification_logic":
                return ["fix verifier logic", "update expected state contract", "add regression coverage"];
            case "execution_runtime_failure":
                return ["fix executor implementation", "capture runtime evidence", "add failure test"];
            case "missing_rollback":
                return ["add rollback contract", "record revert path", "mark action non-reversible if needed"];
            case "missing_knowledge_retrieval":
                return ["seed retrieval hints", "add docs or memory context", "add retrieval test"];
            case "missing_workflow_wrapper":
                return ["add workflow wrapper", "define deterministic step graph", "add workflow eval card"];
            case "approval_state_issue":
                return ["fix approval issuance", "validate token binding", "add approval-state test"];
            case "missing_history_replay_rule":
                return ["add history miner rule", "persist failure signatures", "add replay eval card"];
            case "test_card_defect":
                return ["fix the eval card", "update success definition", "add guardrails to the verifier"];
            default:
                return ["inspect artifacts", "tighten routing and verification"];
        }
    })();
    const rerunRecommendation = primary === "test_card_defect"
        ? "Patch the card or verifier, then rerun the same task."
        : "Implement the smallest safe fix, then rerun the same prompt or card.";
    return {
        primary_gap: primary,
        secondary_gaps: unique(secondary.filter((gap) => gap !== primary)),
        why_this_gap_was_chosen: rationale,
        confidence,
        proposed_fix_types: proposedFixTypes,
        rerun_recommendation: rerunRecommendation
    };
};
