function buildDependencyMap(tasks) {
  const byId = new Map();
  const indegree = new Map();
  const edges = new Map();

  for (const task of tasks) {
    byId.set(task.id, task);
    indegree.set(task.id, 0);
    edges.set(task.id, []);
  }

  for (const task of tasks) {
    for (const dependency of task.dependsOn || []) {
      if (!byId.has(dependency)) continue;
      edges.get(dependency).push(task.id);
      indegree.set(task.id, (indegree.get(task.id) || 0) + 1);
    }
  }

  return { byId, indegree, edges };
}

export function planBrainWorkflow(decomposed) {
  const tasks = Array.isArray(decomposed?.tasks) ? decomposed.tasks : [];
  const { byId, indegree, edges } = buildDependencyMap(tasks);
  const queue = tasks.filter((task) => (indegree.get(task.id) || 0) === 0).map((task) => task.id);
  const steps = [];
  const visited = new Set();

  while (queue.length) {
    const currentIds = queue.splice(0, queue.length);
    const currentTasks = currentIds.map((id) => byId.get(id)).filter(Boolean);
    if (!currentTasks.length) break;
    steps.push({
      step: steps.length + 1,
      tasks: currentTasks,
      canParallel: currentTasks.length > 1,
    });
    for (const task of currentTasks) {
      visited.add(task.id);
      for (const childId of edges.get(task.id) || []) {
        indegree.set(childId, (indegree.get(childId) || 0) - 1);
        if ((indegree.get(childId) || 0) === 0) {
          queue.push(childId);
        }
      }
    }
  }

  const remaining = tasks.filter((task) => !visited.has(task.id));
  if (remaining.length) {
    steps.push({ step: steps.length + 1, tasks: remaining, canParallel: remaining.length > 1 });
  }

  return {
    planId: decomposed?.planId || null,
    intent: decomposed?.intent || null,
    steps,
    totalSteps: steps.length,
  };
}

export function flattenWorkflowSteps(workflow) {
  return (workflow?.steps || []).flatMap((step) => step.tasks || []);
}