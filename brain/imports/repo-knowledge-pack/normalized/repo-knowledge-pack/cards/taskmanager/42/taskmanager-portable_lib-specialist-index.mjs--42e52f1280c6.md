---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/index.mjs"
source_name: "index.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 96
selected_rank: 570
content_hash: "e1c850c6f32b7b2bd4dedb39b03e975227882dab7511573d0c4d78746e09cf43"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "index"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./code-specialist-service.mjs"
  - "./embedding-service.mjs"
  - "./execution-service.mjs"
  - "./index-service.mjs"
  - "./learning-service.mjs"
  - "./orchestrator.mjs"
  - "./rerank-service.mjs"
  - "./retrieval-service.mjs"
  - "./router-service.mjs"
---

# taskmanager/portable_lib/specialist/index.mjs

> Code module; imports ./code-specialist-service.mjs, ./embedding-service.mjs, ./execution-service.mjs, ./index-service.mjs

## Key Signals

- Source path: taskmanager/portable_lib/specialist/index.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 96
- Tags: code, high-value, index, mjs, portable-lib, scripts
- Imports: ./code-specialist-service.mjs, ./embedding-service.mjs, ./execution-service.mjs, ./index-service.mjs, ./learning-service.mjs, ./orchestrator.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, index, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/index.mjs

## Excerpt

~~~javascript
export { SpecialistOrchestrator, getSpecialistOrchestrator } from "./orchestrator.mjs";
export { ScriptIndexService } from "./index-service.mjs";
export { ScriptEmbeddingService } from "./embedding-service.mjs";
export { ScriptRetrievalService } from "./retrieval-service.mjs";
export { ScriptRerankService } from "./rerank-service.mjs";
export { ScriptRouterService } from "./router-service.mjs";
export { ScriptExecutionService } from "./execution-service.mjs";
export { CodeSpecialistService } from "./code-specialist-service.mjs";
export { SpecialistLearningService } from "./learning-service.mjs";
export {
  EXECUTION_MODES,
  EXECUTION_POLICIES,
  SCRIPT_POLICY_CLASS,
  validateRouterDecision,
  normalizeExecutionPolicy,
} from "./contracts.mjs";
~~~