---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/server/runtime-manager/process-monitor-service.mjs"
source_name: "process-monitor-service.mjs"
top_level: "taskmanager"
surface: "server"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: -2
selected_rank: 3462
content_hash: "356ed881bd4c23741e69ed703a62d893ec66d20b94901deb7855fe5586db9008"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "scripts"
  - "server"
imports:
  - "../../shared/task-manager-core.mjs"
exports:
  - "buildProcessMonitorOverview"
---

# taskmanager/server/runtime-manager/process-monitor-service.mjs

> Code module; imports ../../shared/task-manager-core.mjs; exports buildProcessMonitorOverview

## Key Signals

- Source path: taskmanager/server/runtime-manager/process-monitor-service.mjs
- Surface: server
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -2
- Tags: code, high-value, mjs, scripts, server
- Imports: ../../shared/task-manager-core.mjs
- Exports: buildProcessMonitorOverview

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, scripts, server, taskmanager
- Source link target: taskmanager/server/runtime-manager/process-monitor-service.mjs

## Excerpt

~~~javascript
import { buildTaskManagerView } from "../../shared/task-manager-core.mjs";

const MB = 1024 * 1024;

const AI_KEYWORDS = [
  "horizons",
  "assistant",
  "embedding",
  "infer",
  "inference",
  "model",
  "ollama",
  "llama",
  "vllm",
  "cuda",
  "tensor",
  "torch",
  "browser fetch",
  "crawl",
  "scheduler",
  "python",
  "transformers",
];

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
~~~