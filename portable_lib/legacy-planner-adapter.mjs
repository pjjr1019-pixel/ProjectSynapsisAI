import { prepareUserQuery } from "./brain-query-normalize.mjs";
import {
  classifyGovernedApprovalRequirement,
  validateGovernedActionContract,
} from "./governed-contracts.mjs";
import { buildLegacyGovernedChatActionPlan } from "./legacy-governed-planner.mjs";
import { normalizeWorkflowSpec } from "./workflow-spec.mjs";
import { buildVerificationTemplatesForPlan } from "./workflow-verifier.mjs";
import { createPlannerInterface } from "./planner-interface.mjs";
import { updateCanonicalTask } from "./task-model.mjs";

function toSentenceCase(value) {
  const text = String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Workflow";
}

function buildIntentLabelFromPlan(plan) {
  const first = Array.isArray(plan?.steps) ? plan.steps[0] : null;
  return first?.action ? `workflow.${String(first.action).toLowerCase()}` : "workflow.generic";
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

function validateStructuredWorkflow(workflowSpec, options = {}) {
  const errors = [];
  for (const step of Array.isArray(workflowSpec?.steps) ? workflowSpec.steps : []) {
    try {
      validateGovernedActionContract(step.action, step.args || {});
    } catch (error) {
      errors.push({ stepId: step.id, action: step.action, message: String(error?.message || error) });
    }
  }
  return { ok: errors.length === 0, errors, validatedAt: new Date().toISOString(), dryRun: options.dryRun === true };
}

function buildWorkflowSpec(message, prepared, plan) {
  const normalizedSteps = normalizePlanSteps(plan);
  return normalizeWorkflowSpec({
    title: String(message || "").trim() || toSentenceCase(normalizedSteps[0]?.action),
    status: "candidate",
    source: "legacy_capture",
    intentLabel: buildIntentLabelFromPlan({ steps: normalizedSteps }),
    examplePrompts: [String(message || "").trim()],
    slots: [],
    preconditions: [],
    steps: normalizedSteps,
    verification: buildVerificationTemplatesForPlan(normalizedSteps),
    rollbackHints: [],
    approvalProfile: { requiresApproval: normalizedSteps.some((s) => s?.approval?.needsApproval), destructiveActions: [], riskSummary: "", stepScopes: [] },
    successCount: 0,
    failureCount: 0,
    confidence: 0.34,
    tags: ["workflow-runtime"],
    notes: [
      `Planned from request: ${String(message || "").trim()}`,
      "Planner strategy: legacy-adapter",
      `Normalized request: ${prepared.normalized}`,
    ],
  });
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
      approval: step.approval || classifyGovernedApprovalRequirement(step, { dryRun: options.dryRun === true || originalPlan?.dry_run === true }),
    })),
  };
}

function planLegacy(task, context = {}) {
  const message = task.originalRequest;
  const prepared = prepareUserQuery(message);
  const plan = buildLegacyGovernedChatActionPlan(message, {
    dryRun: context.dryRun === true,
    sessionId: context.sessionId,
  });

  if (!plan) {
    return {
      handled: false,
      task: updateCanonicalTask(task, {
        normalizedRequest: prepared.normalized,
        plannerMetadata: { usedLegacyAdapter: false },
      }),
    };
  }

  if (plan._undoRunId) {
    return {
      handled: true,
      kind: "rollback",
      undoRunId: plan._undoRunId,
      task: updateCanonicalTask(task, {
        normalizedRequest: prepared.normalized,
        plannerId: "legacy-adapter",
        plannerMetadata: { usedLegacyAdapter: true },
        plan,
        validation: { ok: true, errors: [], rollbackOnly: true },
      }),
    };
  }

  const workflowSpec = buildWorkflowSpec(message, prepared, plan);
  const validation = validateStructuredWorkflow(workflowSpec, { dryRun: context.dryRun === true });
  const governedPlan = buildGovernedPlanFromWorkflow(workflowSpec, plan, { message, dryRun: context.dryRun === true });

  return {
    handled: true,
    kind: "workflow",
    task: updateCanonicalTask(task, {
      normalizedRequest: prepared.normalized,
      plannerId: "legacy-adapter",
      plannerMetadata: { usedLegacyAdapter: true },
      intentLabel: workflowSpec.intentLabel,
      workflowId: workflowSpec.id,
      workflowStatus: workflowSpec.status,
      plan: governedPlan,
      validation,
      reflection: task.reflection,
    }),
    workflowSpec,
    governedPlan,
    validation,
    plannerSource: "legacy-adapter",
  };
}

export const legacyPlannerAdapter = createPlannerInterface({
  plannerId: "legacy-adapter",
  planTask: planLegacy,
});
