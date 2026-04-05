import { selectBrainTools } from "./brain-tool-selector.mjs";

function toAction(step, task, selection, index) {
  return {
    id: `${step.step}:${task.id}`,
    step: step.step,
    taskId: task.id,
    type: selection.toolType === "service" ? "service" : "node",
    command: selection.toolPath,
    args: selection.params,
    dryRun: true,
    canParallel: Boolean(step.canParallel),
    order: index + 1,
  };
}

export function compileBrainActions(workflow, opts = {}) {
  const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
  const tasks = steps.flatMap((step) => step.tasks || []);
  const selections = selectBrainTools(tasks, { dryRun: opts.dryRun !== false });
  const byTaskId = new Map(selections.map((entry) => [entry.taskId, entry.selection]));
  const actions = [];

  for (const step of steps) {
    const stepTasks = Array.isArray(step.tasks) ? step.tasks : [];
    stepTasks.forEach((task, index) => {
      const selection = byTaskId.get(task.id) || selectBrainTools([task], { dryRun: true })[0].selection;
      actions.push(toAction(step, task, selection, index));
    });
  }

  return {
    planId: workflow?.planId || null,
    intent: workflow?.intent || null,
    dryRun: true,
    actions,
  };
}

export function compileActionSummary(compiled) {
  return (compiled?.actions || []).map((action) => `${action.id}:${action.command}`).join(", ");
}