import process from "node:process";

const DEFAULT_FLAGS = Object.freeze({
  ENABLE_LEGACY_RULE_ROUTER: false,
  ENABLE_MODEL_FIRST_PLANNER: true,
  ENABLE_WORKFLOW_CAPTURE: true,
  ENABLE_WORKFLOW_REUSE: true,
  ENABLE_WORKFLOW_PROMOTION: true,
  ENABLE_MODEL_FIRST_WORKFLOWS: true,
  ENABLE_LEGACY_GOVERNED_CHAT_PLANNER: false,
});

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value, fallback, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getWorkflowRuntimeConfig(overrides = {}) {
  const env = process.env;
  const enableModelFirstWorkflows = parseBoolean(
    overrides.ENABLE_MODEL_FIRST_WORKFLOWS ?? env.ENABLE_MODEL_FIRST_WORKFLOWS,
    DEFAULT_FLAGS.ENABLE_MODEL_FIRST_WORKFLOWS
  );
  const enableLegacyGovernedChatPlanner = parseBoolean(
    overrides.ENABLE_LEGACY_GOVERNED_CHAT_PLANNER ?? env.ENABLE_LEGACY_GOVERNED_CHAT_PLANNER,
    DEFAULT_FLAGS.ENABLE_LEGACY_GOVERNED_CHAT_PLANNER
  );
  const flags = {
    enableLegacyRuleRouter: parseBoolean(
      overrides.ENABLE_LEGACY_RULE_ROUTER ?? env.ENABLE_LEGACY_RULE_ROUTER,
      DEFAULT_FLAGS.ENABLE_LEGACY_RULE_ROUTER
    ),
    enableModelFirstPlanner: parseBoolean(
      overrides.ENABLE_MODEL_FIRST_PLANNER ?? env.ENABLE_MODEL_FIRST_PLANNER,
      DEFAULT_FLAGS.ENABLE_MODEL_FIRST_PLANNER
    ),
    enableWorkflowCapture: parseBoolean(
      overrides.ENABLE_WORKFLOW_CAPTURE ?? env.ENABLE_WORKFLOW_CAPTURE,
      DEFAULT_FLAGS.ENABLE_WORKFLOW_CAPTURE
    ),
    enableWorkflowReuse: parseBoolean(
      overrides.ENABLE_WORKFLOW_REUSE ?? env.ENABLE_WORKFLOW_REUSE,
      DEFAULT_FLAGS.ENABLE_WORKFLOW_REUSE
    ),
    enableWorkflowPromotion: parseBoolean(
      overrides.ENABLE_WORKFLOW_PROMOTION ?? env.ENABLE_WORKFLOW_PROMOTION,
      DEFAULT_FLAGS.ENABLE_WORKFLOW_PROMOTION
    ),
    enableModelFirstWorkflows,
    enableLegacyGovernedChatPlanner,
    enableModelFirstPlanner: enableModelFirstWorkflows,
  };

  return {
    flags,
    thresholds: {
      trustedReuseScore: parseNumber(
        overrides.WORKFLOW_TRUSTED_REUSE_SCORE ?? env.WORKFLOW_TRUSTED_REUSE_SCORE,
        0.66,
        { min: 0.2, max: 0.99 }
      ),
      candidateHintScore: parseNumber(
        overrides.WORKFLOW_CANDIDATE_HINT_SCORE ?? env.WORKFLOW_CANDIDATE_HINT_SCORE,
        0.72,
        { min: 0.2, max: 0.99 }
      ),
      strongMatchScore: parseNumber(
        overrides.WORKFLOW_STRONG_MATCH_SCORE ?? env.WORKFLOW_STRONG_MATCH_SCORE,
        0.82,
        { min: 0.2, max: 0.99 }
      ),
    },
    promotion: {
      trustedSuccessCount: parseNumber(
        overrides.WORKFLOW_PROMOTION_SUCCESS_COUNT ?? env.WORKFLOW_PROMOTION_SUCCESS_COUNT,
        3,
        { min: 2, max: 20 }
      ),
      maxFailureRate: parseNumber(
        overrides.WORKFLOW_PROMOTION_MAX_FAILURE_RATE ?? env.WORKFLOW_PROMOTION_MAX_FAILURE_RATE,
        0.2,
        { min: 0, max: 0.9 }
      ),
      demotionFailureCount: parseNumber(
        overrides.WORKFLOW_DEMOTION_FAILURE_COUNT ?? env.WORKFLOW_DEMOTION_FAILURE_COUNT,
        3,
        { min: 1, max: 20 }
      ),
      demotionFailureRate: parseNumber(
        overrides.WORKFLOW_DEMOTION_FAILURE_RATE ?? env.WORKFLOW_DEMOTION_FAILURE_RATE,
        0.45,
        { min: 0, max: 1 }
      ),
    },
  };
}

export function getWorkflowFeatureFlags(overrides = {}) {
  return getWorkflowRuntimeConfig(overrides).flags;
}
