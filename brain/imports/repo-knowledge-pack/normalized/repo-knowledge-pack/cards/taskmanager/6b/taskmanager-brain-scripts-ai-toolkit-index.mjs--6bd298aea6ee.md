---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/index.mjs"
source_name: "index.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 122
selected_rank: 25
content_hash: "bcf997549ab3b8eff3a27a5e4c2c6ae44848e6900663e469592779c32780a1b0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "index"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "./brain-action-compiler.mjs"
  - "./brain-context-builder.mjs"
  - "./brain-intent-parser.mjs"
  - "./brain-macro-engine.mjs"
  - "./brain-memory-cache.mjs"
  - "./brain-response-validator.mjs"
  - "./brain-retry-controller.mjs"
  - "./brain-task-decomposer.mjs"
  - "./brain-tool-selector.mjs"
  - "./brain-workflow-planner.mjs"
---

# taskmanager/brain/scripts/ai-toolkit/index.mjs

> Script surface; imports ./brain-action-compiler.mjs, ./brain-context-builder.mjs, ./brain-intent-parser.mjs, ./brain-macro-engine.mjs

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/index.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-scripts, code, index, mjs, neutral, scripts
- Imports: ./brain-action-compiler.mjs, ./brain-context-builder.mjs, ./brain-intent-parser.mjs, ./brain-macro-engine.mjs, ./brain-memory-cache.mjs, ./brain-response-validator.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, index, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/index.mjs

## Excerpt

~~~javascript
export { createTaskQueue, compareTaskPriority } from "./optimizer-task-queue.mjs";
export { detectHotspots, summarizeHotspot, hotspotPriority } from "./optimizer-hotspot-detector.mjs";
export { explainOptimizerHealth } from "./optimizer-health-explainer.mjs";
export { buildProcessTree, flattenProcessTree } from "./optimizer-process-grouper.mjs";
export { parseBrainIntent, describeIntent } from "./brain-intent-parser.mjs";
export { decomposeBrainIntent, summarizeTasks } from "./brain-task-decomposer.mjs";
export { planBrainWorkflow, flattenWorkflowSteps } from "./brain-workflow-planner.mjs";
export { selectBrainTool, selectBrainTools } from "./brain-tool-selector.mjs";
export { compileBrainActions, compileActionSummary } from "./brain-action-compiler.mjs";
export { validateBrainResponse, assertBrainResponse } from "./brain-response-validator.mjs";
export { retryBrainOperation, createRetryController } from "./brain-retry-controller.mjs";
export { createBrainMemoryCache, createSharedBrainMemoryCache } from "./brain-memory-cache.mjs";
export { buildBrainContext, buildCachedBrainContext } from "./brain-context-builder.mjs";
export { runBrainMacro, listBrainMacros } from "./brain-macro-engine.mjs";
~~~