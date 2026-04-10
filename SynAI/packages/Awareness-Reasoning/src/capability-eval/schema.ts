import { readFile } from "node:fs/promises";
import type { CapabilityContextRequirement, CapabilityTestCard } from "./types";
import {
  CAPABILITY_CARD_SCHEMA_VERSION,
  CAPABILITY_CARD_SCHEMA_VERSIONS,
  CAPABILITY_PLATFORMS,
  CAPABILITY_RISK_LEVELS,
  CAPABILITY_VERIFIER_TYPES
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()) : [];

const normalizeContextRequirements = (value: unknown): CapabilityContextRequirement[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => ({
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `ctx-${index + 1}`,
      source:
        typeof entry.source === "string" && entry.source.trim()
          ? (entry.source.trim() as CapabilityContextRequirement["source"])
          : "inline",
      query: typeof entry.query === "string" ? entry.query.trim() : undefined,
      path: typeof entry.path === "string" ? entry.path.trim() : undefined,
      value: typeof entry.value === "string" ? entry.value : undefined,
      maxChars:
        typeof entry.maxChars === "number" && Number.isFinite(entry.maxChars)
          ? Math.max(128, Math.floor(entry.maxChars))
          : undefined
    }));
};

const validateContextRequirements = (
  requirements: CapabilityContextRequirement[],
  label: "required_context" | "optional_context",
  errors: string[]
): void => {
  const supportedSources = new Set([
    "awareness.live-usage",
    "awareness.resource-hotspot",
    "awareness.settings-map",
    "awareness.general",
    "workspace.file",
    "workspace.search",
    "inline"
  ]);

  for (const entry of requirements) {
    if (!entry.id.trim()) {
      errors.push(`${label}: every context requirement needs a non-empty id.`);
    }
    if (!supportedSources.has(entry.source)) {
      errors.push(`${label}.${entry.id}: unsupported source "${entry.source}".`);
    }
    if (entry.source === "workspace.file" && !entry.path) {
      errors.push(`${label}.${entry.id}: workspace.file requires "path".`);
    }
    if (
      (entry.source === "awareness.live-usage" ||
        entry.source === "awareness.resource-hotspot" ||
        entry.source === "awareness.settings-map" ||
        entry.source === "awareness.general" ||
        entry.source === "workspace.search") &&
      !entry.query
    ) {
      errors.push(`${label}.${entry.id}: ${entry.source} requires "query".`);
    }
    if (entry.source === "inline" && typeof entry.value !== "string") {
      errors.push(`${label}.${entry.id}: inline context requires "value".`);
    }
  }
};

export const validateCapabilityCard = (rawCard: unknown): string[] => {
  const errors: string[] = [];
  if (!isRecord(rawCard)) {
    return ["Card must be an object."];
  }

  const card = rawCard as Record<string, unknown>;

  if (!CAPABILITY_CARD_SCHEMA_VERSIONS.includes(card.schema_version as (typeof CAPABILITY_CARD_SCHEMA_VERSIONS)[number])) {
    errors.push(`schema_version must be one of: ${CAPABILITY_CARD_SCHEMA_VERSIONS.join(", ")}.`);
  }

  const requiredStringFields = ["id", "name", "category", "description", "prompt", "success_definition"] as const;
  for (const field of requiredStringFields) {
    if (typeof card[field] !== "string" || card[field].trim().length === 0) {
      errors.push(`${field} must be a non-empty string.`);
    }
  }

  if (!CAPABILITY_VERIFIER_TYPES.includes(card.verifier_type as CapabilityTestCard["verifier_type"])) {
    errors.push(`verifier_type must be one of: ${CAPABILITY_VERIFIER_TYPES.join(", ")}.`);
  }
  if (!CAPABILITY_RISK_LEVELS.includes(card.risk_level as CapabilityTestCard["risk_level"])) {
    errors.push(`risk_level must be one of: ${CAPABILITY_RISK_LEVELS.join(", ")}.`);
  }

  if (typeof card.approval_required !== "boolean") {
    errors.push("approval_required must be boolean.");
  }
  if (typeof card.enabled !== "boolean") {
    errors.push("enabled must be boolean.");
  }

  if (typeof card.priority !== "number" || !Number.isFinite(card.priority)) {
    errors.push("priority must be a finite number.");
  }

  const retryPolicy = isRecord(card.retry_policy) ? card.retry_policy : {};
  if (typeof retryPolicy.maxAttempts !== "number" || retryPolicy.maxAttempts < 1) {
    errors.push("retry_policy.maxAttempts must be >= 1.");
  }
  if (typeof retryPolicy.retryDelayMs !== "number" || retryPolicy.retryDelayMs < 0) {
    errors.push("retry_policy.retryDelayMs must be >= 0.");
  }

  if (!isRecord(card.verifier_config)) {
    errors.push("verifier_config must be an object.");
  }

  const requiredContext = normalizeContextRequirements(card.required_context);
  const optionalContext = normalizeContextRequirements(card.optional_context);
  validateContextRequirements(requiredContext, "required_context", errors);
  validateContextRequirements(optionalContext, "optional_context", errors);

  if (card.platform != null && !CAPABILITY_PLATFORMS.includes(card.platform as CapabilityTestCard["platform"])) {
    errors.push(`platform must be one of: ${CAPABILITY_PLATFORMS.join(", ")}.`);
  }

  const taskTypes = [
    "inspection",
    "safe-action",
    "approval-action",
    "refusal",
    "clarification",
    "missing-executor",
    "verification",
    "rollback"
  ] as const;
  if (card.task_type != null && !taskTypes.includes(card.task_type as (typeof taskTypes)[number])) {
    errors.push(`task_type must be one of: ${taskTypes.join(", ")}.`);
  }

  const decisions = ["allow", "allow_with_verification", "require_approval", "deny", "clarify", "plan_only"] as const;
  if (
    card.expected_governance_decision != null &&
    !decisions.includes(card.expected_governance_decision as (typeof decisions)[number])
  ) {
    errors.push(`expected_governance_decision must be one of: ${decisions.join(", ")}.`);
  }

  if (card.expected_risk_tier != null && !CAPABILITY_RISK_LEVELS.includes(card.expected_risk_tier as CapabilityTestCard["expected_risk_tier"])) {
    errors.push(`expected_risk_tier must be one of: ${CAPABILITY_RISK_LEVELS.join(", ")}.`);
  }

  if (card.expected_executor != null && typeof card.expected_executor !== "string") {
    errors.push("expected_executor must be a string.");
  }
  if (card.expected_preflight != null && !Array.isArray(card.expected_preflight)) {
    errors.push("expected_preflight must be an array of strings.");
  }
  if (card.expected_verification != null && !Array.isArray(card.expected_verification)) {
    errors.push("expected_verification must be an array of strings.");
  }
  if (card.expected_outcome != null && typeof card.expected_outcome !== "string") {
    errors.push("expected_outcome must be a string.");
  }
  if (card.safe_autofix_allowed != null && typeof card.safe_autofix_allowed !== "boolean") {
    errors.push("safe_autofix_allowed must be boolean.");
  }
  if (card.prerequisites != null && !Array.isArray(card.prerequisites)) {
    errors.push("prerequisites must be an array of strings.");
  }
  if (card.timeout != null && (typeof card.timeout !== "number" || !Number.isFinite(card.timeout) || card.timeout < 500)) {
    errors.push("timeout must be a finite number >= 500.");
  }
  if (card.notes != null && typeof card.notes !== "string") {
    errors.push("notes must be a string.");
  }

  return errors;
};

export const normalizeCapabilityCard = (rawCard: unknown): CapabilityTestCard => {
  const record = (isRecord(rawCard) ? rawCard : {}) as Record<string, unknown>;
  const verifierConfig = isRecord(record.verifier_config) ? record.verifier_config : {};
  const retryPolicy = isRecord(record.retry_policy) ? record.retry_policy : {};

  return {
    schema_version:
      typeof record.schema_version === "string" &&
      CAPABILITY_CARD_SCHEMA_VERSIONS.includes(record.schema_version as (typeof CAPABILITY_CARD_SCHEMA_VERSIONS)[number])
        ? (record.schema_version as (typeof CAPABILITY_CARD_SCHEMA_VERSIONS)[number])
        : CAPABILITY_CARD_SCHEMA_VERSION,
    id: typeof record.id === "string" ? record.id.trim() : "",
    name: typeof record.name === "string" ? record.name.trim() : "",
    category: typeof record.category === "string" ? record.category.trim() : "",
    description: typeof record.description === "string" ? record.description.trim() : "",
    prompt: typeof record.prompt === "string" ? record.prompt : "",
    success_definition: typeof record.success_definition === "string" ? record.success_definition : "",
    allowed_tools: asStringArray(record.allowed_tools),
    forbidden_tools: asStringArray(record.forbidden_tools),
    required_context: normalizeContextRequirements(record.required_context),
    optional_context: normalizeContextRequirements(record.optional_context),
    verifier_type: (record.verifier_type as CapabilityTestCard["verifier_type"]) ?? "substring-regex",
    verifier_config: verifierConfig,
    remediation_options: asStringArray(record.remediation_options),
    risk_level: (record.risk_level as CapabilityTestCard["risk_level"]) ?? "medium",
    approval_required: Boolean(record.approval_required),
    retry_policy: {
      maxAttempts:
        typeof retryPolicy.maxAttempts === "number" && Number.isFinite(retryPolicy.maxAttempts)
          ? Math.max(1, Math.floor(retryPolicy.maxAttempts))
          : 1,
      retryDelayMs:
        typeof retryPolicy.retryDelayMs === "number" && Number.isFinite(retryPolicy.retryDelayMs)
          ? Math.max(0, Math.floor(retryPolicy.retryDelayMs))
          : 0
    },
    tags: asStringArray(record.tags),
    enabled: Boolean(record.enabled),
    priority: typeof record.priority === "number" && Number.isFinite(record.priority) ? record.priority : 0,
    platform:
      typeof record.platform === "string" && CAPABILITY_PLATFORMS.includes(record.platform as CapabilityTestCard["platform"])
        ? (record.platform as CapabilityTestCard["platform"])
        : undefined,
    environment_preconditions: asStringArray(record.environment_preconditions),
    regression_group: typeof record.regression_group === "string" ? record.regression_group : null,
    prerequisite_tests: asStringArray(record.prerequisite_tests),
    timeout_ms:
      typeof record.timeout_ms === "number" && Number.isFinite(record.timeout_ms)
        ? Math.max(500, Math.floor(record.timeout_ms))
        : undefined,
    expected_artifacts: asStringArray(record.expected_artifacts),
    task_type:
      typeof record.task_type === "string" &&
      [
        "inspection",
        "safe-action",
        "approval-action",
        "refusal",
        "clarification",
        "missing-executor",
        "verification",
        "rollback"
      ].includes(record.task_type)
        ? (record.task_type as CapabilityTestCard["task_type"])
        : undefined,
    action_intent: typeof record.action_intent === "string" ? record.action_intent : undefined,
    expected_governance_decision:
      typeof record.expected_governance_decision === "string" &&
      ["allow", "allow_with_verification", "require_approval", "deny", "clarify", "plan_only"].includes(
        record.expected_governance_decision
      )
        ? (record.expected_governance_decision as CapabilityTestCard["expected_governance_decision"])
        : undefined,
    expected_risk_tier:
      typeof record.expected_risk_tier === "string" &&
      CAPABILITY_RISK_LEVELS.includes(record.expected_risk_tier as CapabilityTestCard["expected_risk_tier"])
        ? (record.expected_risk_tier as CapabilityTestCard["expected_risk_tier"])
        : undefined,
    expected_executor: typeof record.expected_executor === "string" ? record.expected_executor : undefined,
    expected_preflight: asStringArray(record.expected_preflight),
    expected_verification: asStringArray(record.expected_verification),
    expected_outcome: typeof record.expected_outcome === "string" ? record.expected_outcome : undefined,
    safe_autofix_allowed: typeof record.safe_autofix_allowed === "boolean" ? record.safe_autofix_allowed : undefined,
    prerequisites: asStringArray(record.prerequisites),
    timeout:
      typeof record.timeout === "number" && Number.isFinite(record.timeout)
        ? Math.max(500, Math.floor(record.timeout))
        : undefined,
    notes: typeof record.notes === "string" ? record.notes : undefined
  };
};

export const parseCapabilityCard = (rawCard: unknown, sourcePath?: string): CapabilityTestCard => {
  const normalized = normalizeCapabilityCard(rawCard);
  const errors = validateCapabilityCard(normalized);
  if (errors.length > 0) {
    const prefix = sourcePath ? `Invalid capability card at ${sourcePath}` : "Invalid capability card";
    throw new Error(`${prefix}:\n- ${errors.join("\n- ")}`);
  }
  return normalized;
};

export const loadCapabilityCardFromFile = async (filePath: string): Promise<CapabilityTestCard> => {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return parseCapabilityCard(parsed, filePath);
};
