const TOOL_MAP = Object.freeze({
  calculator: { toolPath: "brain-calculator.mjs", toolType: "builtin" },
  scenario: { toolPath: "brain-scenario-lookup.mjs", toolType: "builtin" },
  subquery: { toolPath: "brain-query-decompose.mjs", toolType: "builtin" },
  help: { toolPath: "brain-chat-reply.mjs", toolType: "service" },
  plan: { toolPath: "brain-workflow-planner.mjs", toolType: "builtin" },
  clarify: { toolPath: "brain-chat-reply.mjs", toolType: "service" },
  intent: { toolPath: "brain-intent-parser.mjs", toolType: "builtin" },
  "hotspot-analysis": { toolPath: "optimizer-hotspot-detector.mjs", toolType: "builtin" },
  validate: { toolPath: "brain-response-validator.mjs", toolType: "builtin" },
  retry: { toolPath: "brain-retry-controller.mjs", toolType: "builtin" },
  cache: { toolPath: "brain-memory-cache.mjs", toolType: "builtin" },
});

function fallbackSelection(task) {
  return {
    toolPath: "brain-chat-reply.mjs",
    toolType: "service",
    params: { taskType: task?.type || "unknown" },
  };
}

export function selectBrainTool(task, opts = {}) {
  const entry = TOOL_MAP[task?.type] || fallbackSelection(task);
  return {
    toolPath: entry.toolPath,
    toolType: entry.toolType,
    params: {
      ...(entry.params || {}),
      taskId: task?.id || null,
      taskType: task?.type || null,
      input: task?.input ?? null,
      dryRun: opts.dryRun !== false,
    },
  };
}

export function selectBrainTools(tasks = [], opts = {}) {
  return (Array.isArray(tasks) ? tasks : []).map((task) => ({
    taskId: task.id,
    taskType: task.type,
    selection: selectBrainTool(task, opts),
  }));
}