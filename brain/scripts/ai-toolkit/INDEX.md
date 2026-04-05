# AI Toolkit Scripts

Canonical brain-side implementation location for the deterministic optimizer and assistant pipeline modules.

## Modules

- `optimizer-task-queue.mjs`
- `optimizer-hotspot-detector.mjs`
- `optimizer-health-explainer.mjs`
- `optimizer-process-grouper.mjs`
- `brain-intent-parser.mjs`
- `brain-task-decomposer.mjs`
- `brain-workflow-planner.mjs`
- `brain-tool-selector.mjs`
- `brain-action-compiler.mjs`
- `brain-response-validator.mjs`
- `brain-retry-controller.mjs`
- `brain-memory-cache.mjs`
- `brain-context-builder.mjs`
- `brain-macro-engine.mjs`

## Macro Registry

- `../../data/macros/macros.json`

## Export Surface

Import the full toolkit with `index.mjs`:

```js
export * from "./index.mjs";
```