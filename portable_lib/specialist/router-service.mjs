import {
  DEFAULT_ROUTER_RESULT,
  EXECUTION_MODES,
  EXECUTION_POLICIES,
  SCRIPT_POLICY_CLASS,
  normalizeExecutionPolicy,
  validateRouterDecision,
} from "./contracts.mjs";

function decideExecutionMode(policy, candidate, confidence) {
  const safetyClass = String(candidate?.policy_class || SCRIPT_POLICY_CLASS.LOCAL_SAFE);

  if (policy === EXECUTION_POLICIES.DRY_RUN) return EXECUTION_MODES.DRY_RUN;
  if (policy === EXECUTION_POLICIES.SUGGEST_ONLY) return EXECUTION_MODES.SUGGEST_ONLY;

  if (policy === EXECUTION_POLICIES.AUTORUN_SAFE_ONLY) {
    if (confidence < 0.8) return EXECUTION_MODES.ASK_FIRST;
    if (safetyClass === SCRIPT_POLICY_CLASS.READ_ONLY_SAFE || safetyClass === SCRIPT_POLICY_CLASS.LOCAL_SAFE) {
      return EXECUTION_MODES.AUTORUN;
    }
    return EXECUTION_MODES.ASK_FIRST;
  }

  if (policy === EXECUTION_POLICIES.AUTORUN_WITH_POLICY) {
    if (confidence < 0.9) return EXECUTION_MODES.ASK_FIRST;
    if (safetyClass === SCRIPT_POLICY_CLASS.DESTRUCTIVE || safetyClass === SCRIPT_POLICY_CLASS.SYSTEM_SENSITIVE) {
      return EXECUTION_MODES.ASK_FIRST;
    }
    return EXECUTION_MODES.AUTORUN;
  }

  return EXECUTION_MODES.ASK_FIRST;
}

export class ScriptRouterService {
  constructor({ routerModelProvider, confidenceThreshold = 0.62 }) {
    this.routerModelProvider = routerModelProvider;
    this.confidenceThreshold = confidenceThreshold;
  }

  async warm() {
    return this.routerModelProvider.warm();
  }

  async route({ request, topCandidates, executionPolicy }) {
    if (!topCandidates?.length) {
      return {
        decision: { ...DEFAULT_ROUTER_RESULT, reason: "No ranked candidates." },
      };
    }

    const policy = normalizeExecutionPolicy(executionPolicy);
    const raw = await this.routerModelProvider.route({ request, candidates: topCandidates, executionPolicy: policy });
    const validated = validateRouterDecision(raw);

    const selected = topCandidates.find((candidate) => candidate.id === validated.selected_script_id) || topCandidates[0];
    const confidence = Math.max(validated.confidence, Number(selected?.rerank_score || selected?.base_score || 0));
    const executionMode = decideExecutionMode(policy, selected, confidence);

    const fallbackToCodeSpecialist = confidence < 0.45;
    const fallbackToGeneralAI = confidence < this.confidenceThreshold;
    const needsConfirmation = executionMode !== EXECUTION_MODES.AUTORUN;

    const decision = validateRouterDecision({
      ...validated,
      selected_script_id: selected?.id || null,
      selected_script_path: selected?.path || null,
      confidence,
      execution_mode: executionMode,
      needs_confirmation: needsConfirmation,
      fallback_to_code_specialist: fallbackToCodeSpecialist,
      fallback_to_general_ai: fallbackToGeneralAI,
      reason: validated.reason || "Router selected best-ranked candidate.",
    });

    return {
      decision,
      selected,
      policy,
    };
  }
}
