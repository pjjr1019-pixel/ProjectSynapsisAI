import type {
  CapabilityGapClassification,
  CapabilityGapType,
  CapabilityTestCard,
  CapabilityVerifierResult,
  LocalAiEvalExecutionResult
} from "../types";

const unique = <T>(values: T[]): T[] => [...new Set(values)];

export interface GapClassifierInput {
  card: CapabilityTestCard;
  execution: LocalAiEvalExecutionResult;
  verifier: CapabilityVerifierResult;
}

const includesAny = (haystack: string, needles: string[]): boolean => {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
};

export const classifyCapabilityGap = (input: GapClassifierInput): CapabilityGapClassification => {
  const { card, execution, verifier } = input;
  const reasonsText = verifier.reasons.join(" | ");
  const secondary: CapabilityGapType[] = [];
  let primary: CapabilityGapType = "bad-reasoning-planning";
  let confidence = 0.62;
  let rationale = "Defaulted to reasoning/planning gap after verifier failure.";

  const missingRequiredContextCount = execution.request.context.missingRequired.length;
  const missingInfoCount = execution.output.missing_information.length;

  if (
    includesAny(reasonsText, ["custom-hook verifier", "unsupported verifier", "invalid required command regex"]) ||
    card.verifier_type === "custom-hook"
  ) {
    primary = "verifier-limitation";
    confidence = 0.92;
    rationale = "Verifier failed due to hook/config limitations instead of a clear model capability miss.";
  } else if (
    execution.output.answer_or_action.mode === "refusal" &&
    (card.approval_required || execution.output.safety_flags.includes("approval-required"))
  ) {
    primary = "safety-governance-block";
    confidence = 0.9;
    rationale = "Model refused action due to approval/safety constraints, which is likely policy behavior.";
  } else if (missingRequiredContextCount > 0) {
    primary = "ambiguous-prompt-insufficient-context";
    confidence = 0.88;
    rationale = "Required context was unavailable, so the prompt was under-specified for deterministic success.";
    secondary.push("missing-retrieval");
  } else if (
    includesAny(reasonsText, ["Missing required tool", "Forbidden tool/workflow selected"]) ||
    includesAny(reasonsText, ["Missing required action id"])
  ) {
    primary = "missing-tool";
    confidence = 0.82;
    rationale = "Failure points to unavailable or unselected tooling needed for the task.";
    secondary.push("missing-workflow-skill");
  } else if (
    (card.verifier_type === "command-action-selection" ||
      card.verifier_type === "action-sequence" ||
      card.verifier_type === "action-preconditions") &&
    (execution.output.answer_or_action.proposed_actions?.length ?? 0) === 0
  ) {
    primary = "missing-workflow-skill";
    confidence = 0.8;
    rationale = "Task expected explicit action planning, but no actionable workflow proposal was produced.";
  } else if (
    card.verifier_type === "action-risk-class" ||
    card.verifier_type === "action-approval-token"
  ) {
    primary = "safety-governance-block";
    confidence = 0.84;
    rationale = "Action risk or token governance constraints failed deterministic policy checks.";
    secondary.push("missing-workflow-skill");
  } else if (
    execution.request.context.retrievalStats.requiredResolved === 0 &&
    execution.request.context.required.length > 0
  ) {
    primary = "missing-retrieval";
    confidence = 0.83;
    rationale = "Retriever failed to supply required evidence sources for this card.";
  } else if (
    includesAny(reasonsText, ["Missing required phrase", "Expected exact match"]) &&
    missingInfoCount === 0 &&
    execution.output.plan.length > 0
  ) {
    primary = "missing-knowledge";
    confidence = 0.74;
    rationale = "Model produced a coherent output but lacked specific expected factual/task knowledge.";
  } else if (execution.output.safety_flags.includes("parse-error")) {
    primary = "bad-reasoning-planning";
    confidence = 0.76;
    rationale = "Structured output contract was not followed, indicating planning/execution quality issues.";
    secondary.push("missing-workflow-skill");
  } else if (missingInfoCount > 0 && execution.request.context.required.length === 0) {
    primary = "ambiguous-prompt-insufficient-context";
    confidence = 0.72;
    rationale = "Model reported missing inputs and card did not provide required context contracts.";
  } else {
    primary = "bad-reasoning-planning";
    confidence = 0.62;
    rationale = "Failure appears to be decomposition/selection quality despite available context and tools.";
    secondary.push("missing-knowledge");
  }

  if (primary !== "verifier-limitation" && execution.output.safety_flags.includes("parse-error")) {
    secondary.push("bad-reasoning-planning");
  }
  if (primary !== "safety-governance-block" && execution.output.answer_or_action.mode === "refusal") {
    secondary.push("safety-governance-block");
  }
  if (missingRequiredContextCount > 0 && primary !== "ambiguous-prompt-insufficient-context") {
    secondary.push("ambiguous-prompt-insufficient-context");
  }

  const recommendedNextActions = (() => {
    switch (primary) {
      case "missing-knowledge":
        return [
          "Add or refine canonical docs/examples for this capability.",
          "Seed retrieval with explicit source snippets for the failure topic."
        ];
      case "missing-retrieval":
        return [
          "Improve indexing metadata and query tags for required sources.",
          "Add deterministic required_context entries in the card."
        ];
      case "missing-tool":
        return [
          "Expose the required tool in the allowed tool registry.",
          "Add a verifier guard ensuring forbidden tools remain blocked."
        ];
      case "missing-workflow-skill":
        return [
          "Add deterministic workflow wrapper for this task family.",
          "Bind workflow id expectations in workflow/tool-selection verifier."
        ];
      case "bad-reasoning-planning":
        return [
          "Tighten planner prompt contract for step decomposition.",
          "Add structured output examples with pass/fail contrasts."
        ];
      case "safety-governance-block":
        return [
          "Mark card as expected refusal when no approval is present.",
          "Use approval-gated mode for actions requiring elevated risk."
        ];
      case "ambiguous-prompt-insufficient-context":
        return [
          "Clarify card prompt and add required_context evidence hooks.",
          "Reduce ambiguity by adding expected action/output boundaries."
        ];
      case "verifier-limitation":
        return [
          "Fix verifier config/hook and rerun the same card.",
          "Avoid changing model behavior until verifier reliability is restored."
        ];
      default:
        return ["Inspect artifacts and refine card/verifier contracts."];
    }
  })();

  return {
    primary_gap: primary,
    secondary_gaps: unique(secondary.filter((gap) => gap !== primary)),
    why_this_gap_was_chosen: rationale,
    confidence,
    recommended_next_actions: recommendedNextActions
  };
};
