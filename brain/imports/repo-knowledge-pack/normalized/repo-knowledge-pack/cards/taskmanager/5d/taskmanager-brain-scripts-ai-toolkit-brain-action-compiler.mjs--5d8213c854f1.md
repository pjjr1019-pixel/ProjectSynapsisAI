---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-action-compiler.mjs"
source_name: "brain-action-compiler.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 121
content_hash: "9c77e5cc55067863f5108a20cadc73e279c3ab8a28f755db23b96b6368cc9c0d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "./brain-tool-selector.mjs"
exports:
  - "compileActionSummary"
  - "compileBrainActions"
---

# taskmanager/brain/scripts/ai-toolkit/brain-action-compiler.mjs

> Script surface; imports ./brain-tool-selector.mjs; exports compileActionSummary, compileBrainActions

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-action-compiler.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Imports: ./brain-tool-selector.mjs
- Exports: compileActionSummary, compileBrainActions

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-action-compiler.mjs

## Excerpt

~~~javascript
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
~~~