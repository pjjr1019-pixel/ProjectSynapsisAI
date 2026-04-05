import { getWorkflowRuntimeConfig } from "./workflow-config.mjs";
import { legacyPlannerAdapter } from "./legacy-planner-adapter.mjs";
import { createCanonicalTask } from "./task-model.mjs";
import { classifyGovernedApprovalRequirement, validateGovernedActionContract } from "./governed-contracts.mjs";

function buildGovernedPlanFromWorkflow(workflowSpec, options = {}) {
  const steps = Array.isArray(workflowSpec?.steps) ? workflowSpec.steps : [];
  return {
    workflow_id: workflowSpec.id,
    source: "workflow-runtime",
    message: String(options.message || workflowSpec?.title || "").trim(),
    dry_run: options.dryRun === true,
    planner: "workflow-runtime",
    steps: steps.map((step) => ({ action: step.action, args: step.args, approval: step.approval })),
  };
}

export function planWorkflowFromRequest(message, options = {}) {
  const config = getWorkflowRuntimeConfig(options.configOverrides);
  const task = createCanonicalTask(
    {
      originalRequest: String(message || "").trim(),
      sourceRoute: options.sourceRoute || "workflow-runtime",
    },
    { sourceRoute: options.sourceRoute || "workflow-runtime" }
  );

  const planned = legacyPlannerAdapter.planTask(task, {
    dryRun: options.dryRun === true,
    sessionId: options.sessionId,
  });

  if (!planned?.handled) {
    return {
      handled: false,
      task: planned?.task || task,
      originalRequest: task.originalRequest,
      normalizedRequest: planned?.task?.normalizedRequest || task.normalizedRequest,
      plannerSource: null,
      workflowSpec: null,
      governedPlan: null,
      validation: { ok: false, errors: [] },
      usedLegacyAdapter: false,
      legacyPlannerEnabled: config.flags.enableLegacyGovernedChatPlanner,
    };
  }

  if (planned.kind === "rollback") {
    return {
      handled: true,
      kind: "rollback",
      task: planned.task,
      originalRequest: planned.task.originalRequest,
      normalizedRequest: planned.task.normalizedRequest,
      plannerSource: "legacy-adapter",
      workflowSpec: null,
      governedPlan: planned.task.plan,
      validation: planned.task.validation,
      undoRunId: planned.undoRunId,
      usedLegacyAdapter: true,
      legacyPlannerEnabled: config.flags.enableLegacyGovernedChatPlanner,
    };
  }

  return {
    handled: true,
    kind: "workflow",
    task: planned.task,
    originalRequest: planned.task.originalRequest,
    normalizedRequest: planned.task.normalizedRequest,
    plannerSource: planned.plannerSource,
    workflowSpec: planned.workflowSpec,
    governedPlan: planned.governedPlan,
    validation: planned.validation,
    usedLegacyAdapter: true,
    legacyPlannerEnabled: config.flags.enableLegacyGovernedChatPlanner,
  };
}

export function instantiateGovernedPlanFromWorkflow(workflowSpec, options = {}) {
  const steps = Array.isArray(workflowSpec?.steps) ? workflowSpec.steps : [];
  const validationErrors = [];
  for (const step of steps) {
    try {
      validateGovernedActionContract(step.action, step.args || {});
    } catch (error) {
      validationErrors.push({
        stepId: step.id || null,
        action: step.action || null,
        message: String(error?.message || error),
      });
    }
  }
  const governedPlan = buildGovernedPlanFromWorkflow(workflowSpec, options);
  return {
    governedPlan: {
      ...governedPlan,
      steps: steps.map((step) => ({
        action: step.action,
        args: step.args,
        approval: step.approval || classifyGovernedApprovalRequirement(step, { dryRun: options.dryRun === true }),
      })),
    },
    validation: {
      ok: validationErrors.length === 0,
      errors: validationErrors,
      validatedAt: new Date().toISOString(),
      dryRun: options.dryRun === true,
    },
  };
}
