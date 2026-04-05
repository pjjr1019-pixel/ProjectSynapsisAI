---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-tool-selector.mjs"
source_name: "brain-tool-selector.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 128
content_hash: "3e9ded8910ed4501292917fc4c90ec32c30eef95a03983d8110837cfdecb044d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "selectBrainTool"
  - "selectBrainTools"
---

# taskmanager/brain/scripts/ai-toolkit/brain-tool-selector.mjs

> Script surface; exports selectBrainTool, selectBrainTools

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-tool-selector.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: selectBrainTool, selectBrainTools

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-tool-selector.mjs

## Excerpt

~~~javascript
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
~~~