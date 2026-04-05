---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-macro-engine.mjs"
source_name: "brain-macro-engine.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 123
content_hash: "fda134b3067673174232015c67fac390eab98bad901204e36299fabe331df965"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "./brain-action-compiler.mjs"
  - "./brain-context-builder.mjs"
  - "./brain-intent-parser.mjs"
  - "./brain-task-decomposer.mjs"
  - "./brain-workflow-planner.mjs"
  - "./optimizer-health-explainer.mjs"
  - "node:fs"
  - "node:path"
  - "node:url"
exports:
  - "async"
  - "listBrainMacros"
---

# taskmanager/brain/scripts/ai-toolkit/brain-macro-engine.mjs

> Script surface; imports ./brain-action-compiler.mjs, ./brain-context-builder.mjs, ./brain-intent-parser.mjs, ./brain-task-decomposer.mjs; exports async, listBrainMacros

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-macro-engine.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Imports: ./brain-action-compiler.mjs, ./brain-context-builder.mjs, ./brain-intent-parser.mjs, ./brain-task-decomposer.mjs, ./brain-workflow-planner.mjs, ./optimizer-health-explainer.mjs
- Exports: async, listBrainMacros

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-macro-engine.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBrainIntent } from "./brain-intent-parser.mjs";
import { decomposeBrainIntent } from "./brain-task-decomposer.mjs";
import { planBrainWorkflow } from "./brain-workflow-planner.mjs";
import { compileBrainActions } from "./brain-action-compiler.mjs";
import { buildBrainContext } from "./brain-context-builder.mjs";
import { explainOptimizerHealth } from "./optimizer-health-explainer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const macrosPath = path.resolve(__dirname, "..", "..", "data", "macros", "macros.json");

function readMacros() {
  try {
    if (!fs.existsSync(macrosPath)) return { macros: {} };
    return JSON.parse(fs.readFileSync(macrosPath, "utf8"));
  } catch {
    return { macros: {} };
  }
}

function summarizeStep(step, output) {
  return {
    name: String(step.name || step.type || "step"),
    status: output?.error ? "failed" : "completed",
    output,
  };
~~~