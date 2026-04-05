import { prepareUserQuery } from "./brain-query-normalize.mjs";
import { getWorkflowRuntimeConfig } from "./workflow-config.mjs";
import {
  buildLegacyGovernedChatActionPlan as buildLegacyGovernedPlanAdapter,
  classifyGovernedApprovalRequirement,
  validateGovernedActionContract,
} from "./governed-actions.mjs";
import { normalizeWorkflowSpec } from "./workflow-spec.mjs";
import { buildVerificationTemplatesForPlan } from "./workflow-verifier.mjs";

function toSentenceCase(value) {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Workflow";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildIntentLabelFromPlan(plan) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!steps.length) return "workflow.generic";
  if (steps.length === 1) {
    const step = steps[0];
    if (step.action === "open_system_utility") {
      const utility = String(step.args?.utility || "utility").trim().replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      return `system.open_utility.${utility}`;
    }
    if (step.action === "batch_summarize_folder") return "document.batch_summarize_folder";
    if (step.action === "export_summary_report") return "document.export_summary_report";
    if (step.action === "summarize_document") return "document.summarize_document";
    if (step.action === "list_directory") return "filesystem.list_directory";
    if (step.action === "read_text_file") return "filesystem.read_text_file";
    if (step.action === "search_files") return "filesystem.search_files";
    return `filesystem.${String(step.action || "action").toLowerCase()}`;
  }
  return `workflow.compound.${String(steps[0]?.action || "mixed").toLowerCase()}`;
}

function buildWorkflowTitle(message, plan) {
  const explicit = String(message || "").trim().replace(/\s+/g, " ");
  if (explicit) {
    return explicit.length > 80 ? `${explicit.slice(0, 77)}...` : explicit;
  }
  const firstStep = plan?.steps?.[0];
  return firstStep ? toSentenceCase(firstStep.action) : "Workflow";
}

function buildApprovalProfile(plan) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  return {
    requiresApproval: steps.some((step) => step?.approval?.needsApproval),
    destructiveActions: steps
      .filter((step) => ["delete_file", "move_file", "rename_file"].includes(step.action))
      .map((step) => step.action),
    riskSummary:
      steps
        .filter((step) => step?.approval?.needsApproval)
        .map((step) => `${step.action}: ${step.approval.risk}`)
        .join(" | ") || "No elevated risk detected.",
    stepScopes: steps.map((step) => ({
      stepId: String(step.id || ""),
      action: step.action,
      needsApproval: step?.approval?.needsApproval === true,
      scope: step?.approval?.scope || null,
      risk: step?.approval?.risk || null,
    })),
  };
}

function buildRollbackHints(plan) {
  return (Array.isArray(plan?.steps) ? plan.steps : [])
    .filter((step) => ["write_text_file", "append_text_file", "move_file", "rename_file", "delete_file"].includes(step.action))
    .map((step) => ({
      stepId: String(step.id || ""),
      action: step.action,
      strategy: "governed_run_rollback",
      note: "Use the governed run rollback endpoint for snapshot-based restoration.",
    }));
}

function buildPreconditions(plan) {
  return (Array.isArray(plan?.steps) ? plan.steps : []).flatMap((step) => {
    const items = [];
    if (step.args?.source) {
      items.push({ kind: "path_exists", path: step.args.source, description: "Source path must exist." });
    }
    if (step.args?.path && ["read_text_file", "delete_file", "rename_file", "inspect_document"].includes(step.action)) {
      items.push({ kind: "path_exists", path: step.args.path, description: "Target path must exist." });
    }
    return items;
  });
}

function normalizePlanSteps(plan) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  return steps.map((step, index) => ({
    id: String(step.id || `step-${index + 1}`),
    title: toSentenceCase(step.action || `step ${index + 1}`),
    action: String(step.action || ""),
    args: step.args && typeof step.args === "object" ? step.args : {},
    approval: step.approval || classifyGovernedApprovalRequirement(step, { dryRun: plan?.dry_run === true }),
    slotBindings: [],
    notes: [],
  }));
}

function buildWorkflowSpecFromPlan(message, prepared, plan, plannerSource) {
  const normalizedSteps = normalizePlanSteps(plan);
  return normalizeWorkflowSpec({
    title: buildWorkflowTitle(message, plan),
    status: "candidate",
    source: plannerSource === "legacy-adapter" ? "legacy_capture" : "model_planned",
    intentLabel: buildIntentLabelFromPlan({ steps: normalizedSteps }),
    examplePrompts: [String(message || "").trim()],
    slots: [],
    preconditions: buildPreconditions({ steps: normalizedSteps }),
    steps: normalizedSteps,
    verification: buildVerificationTemplatesForPlan(normalizedSteps),
    rollbackHints: buildRollbackHints({ steps: normalizedSteps }),
    approvalProfile: buildApprovalProfile({ steps: normalizedSteps }),
    successCount: 0,
    failureCount: 0,
    confidence: 0.34,
    tags: Array.from(new Set([
      "workflow-runtime",
      ...normalizedSteps.map((step) => step.action),
    ])).sort(),
    notes: [
      `Planned from request: ${String(message || "").trim()}`,
      `Planner strategy: ${plannerSource}`,
      `Normalized request: ${prepared.normalized}`,
    ],
  });
}

function validateStructuredWorkflow(workflowSpec, options = {}) {
  const errors = [];
  const steps = Array.isArray(workflowSpec?.steps) ? workflowSpec.steps : [];
  for (const step of steps) {
    try {
      validateGovernedActionContract(step.action, step.args || {});
    } catch (error) {
      errors.push({
        stepId: step.id,
        action: step.action,
        message: String(error?.message || error),
      });
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    validatedAt: new Date().toISOString(),
    dryRun: options.dryRun === true,
  };
}

function buildGovernedPlanFromWorkflow(workflowSpec, originalPlan, options = {}) {
  const steps = Array.isArray(workflowSpec?.steps) ? workflowSpec.steps : [];
  return {
    ...(originalPlan && typeof originalPlan === "object" ? originalPlan : {}),
    workflow_id: workflowSpec.id,
    source: "workflow-runtime",
    message: String(options.message || originalPlan?.message || workflowSpec?.title || "").trim(),
    dry_run: options.dryRun === true || originalPlan?.dry_run === true,
    planner: "workflow-runtime",
    steps: steps.map((step) => ({
      action: step.action,
      args: step.args,
      approval:
        step.approval ||
        classifyGovernedApprovalRequirement(step, {
          dryRun: options.dryRun === true || originalPlan?.dry_run === true,
        }),
    })),
  };
}

export function planWorkflowFromRequest(message, options = {}) {
  const config = getWorkflowRuntimeConfig(options.configOverrides);
  const prepared = prepareUserQuery(message);
  const plan =
    buildLegacyGovernedPlanAdapter(message, {
      dryRun: options.dryRun === true,
      sessionId: options.sessionId,
    }) ||
    null;

  if (!plan) {
    return {
      handled: false,
      originalRequest: String(message || "").trim(),
      normalizedRequest: prepared.normalized,
      plannerSource: null,
      workflowSpec: null,
      governedPlan: null,
      validation: { ok: false, errors: [] },
      usedLegacyAdapter: false,
      legacyPlannerEnabled: config.flags.enableLegacyGovernedChatPlanner,
    };
  }

  if (plan._undoRunId) {
    return {
      handled: true,
      kind: "rollback",
      originalRequest: String(message || "").trim(),
      normalizedRequest: prepared.normalized,
      plannerSource: "legacy-adapter",
      workflowSpec: null,
      governedPlan: plan,
      validation: { ok: true, errors: [], rollbackOnly: true },
      undoRunId: plan._undoRunId,
      usedLegacyAdapter: true,
      legacyPlannerEnabled: config.flags.enableLegacyGovernedChatPlanner,
    };
  }

  const workflowSpec = buildWorkflowSpecFromPlan(message, prepared, plan, "legacy-adapter");
  const validation = validateStructuredWorkflow(workflowSpec, { dryRun: options.dryRun === true });
  const governedPlan = buildGovernedPlanFromWorkflow(workflowSpec, plan, {
    message,
    dryRun: options.dryRun === true,
  });

  return {
    handled: true,
    kind: "workflow",
    originalRequest: String(message || "").trim(),
    normalizedRequest: prepared.normalized,
    plannerSource: "legacy-adapter",
    workflowSpec,
    governedPlan,
    validation,
    usedLegacyAdapter: true,
    legacyPlannerEnabled: config.flags.enableLegacyGovernedChatPlanner,
  };
}

export function instantiateGovernedPlanFromWorkflow(workflowSpec, options = {}) {
  const validation = validateStructuredWorkflow(workflowSpec, { dryRun: options.dryRun === true });
  return {
    governedPlan: buildGovernedPlanFromWorkflow(workflowSpec, null, options),
    validation,
  };
}
