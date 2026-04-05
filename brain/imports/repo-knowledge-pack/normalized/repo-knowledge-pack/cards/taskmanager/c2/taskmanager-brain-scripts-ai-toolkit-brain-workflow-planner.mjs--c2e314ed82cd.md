---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-workflow-planner.mjs"
source_name: "brain-workflow-planner.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 129
content_hash: "99f5fdea6acb8ca539e91dc57675970014c1c79f934640dde57da9c734994eff"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "flattenWorkflowSteps"
  - "planBrainWorkflow"
---

# taskmanager/brain/scripts/ai-toolkit/brain-workflow-planner.mjs

> Script surface; exports flattenWorkflowSteps, planBrainWorkflow

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-workflow-planner.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: flattenWorkflowSteps, planBrainWorkflow

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-workflow-planner.mjs

## Excerpt

~~~javascript
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
~~~