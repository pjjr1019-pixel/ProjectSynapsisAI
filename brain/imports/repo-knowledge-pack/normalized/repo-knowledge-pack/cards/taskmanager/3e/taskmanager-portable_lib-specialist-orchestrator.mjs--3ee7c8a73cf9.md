---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/orchestrator.mjs"
source_name: "orchestrator.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 667
content_hash: "e2e5ddfe9e972d6f99c5f5d9fee7ecff8b3d25bdd30c2a3ed29369c1ee626dfc"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./code-specialist-service.mjs"
  - "./embedding-service.mjs"
  - "./execution-service.mjs"
  - "./index-service.mjs"
  - "./learning-service.mjs"
  - "./observability.mjs"
  - "./paths.mjs"
  - "./rerank-service.mjs"
  - "./retrieval-service.mjs"
  - "./router-service.mjs"
exports:
  - "getSpecialistOrchestrator"
  - "SpecialistOrchestrator"
---

# taskmanager/portable_lib/specialist/orchestrator.mjs

> Code module; imports ./code-specialist-service.mjs, ./embedding-service.mjs, ./execution-service.mjs, ./index-service.mjs; exports getSpecialistOrchestrator, SpecialistOrchestrator

## Key Signals

- Source path: taskmanager/portable_lib/specialist/orchestrator.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./code-specialist-service.mjs, ./embedding-service.mjs, ./execution-service.mjs, ./index-service.mjs, ./learning-service.mjs, ./observability.mjs
- Exports: getSpecialistOrchestrator, SpecialistOrchestrator

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/orchestrator.mjs

## Excerpt

~~~javascript
import {
  EXECUTION_POLICIES,
  normalizeExecutionPolicy,
} from "./contracts.mjs";
import { getSpecialistPaths } from "./paths.mjs";
import { ScriptIndexService } from "./index-service.mjs";
import { ScriptEmbeddingService } from "./embedding-service.mjs";
import { ScriptRetrievalService } from "./retrieval-service.mjs";
import { ScriptRerankService } from "./rerank-service.mjs";
import { ScriptRouterService } from "./router-service.mjs";
import { ScriptExecutionService } from "./execution-service.mjs";
import { SpecialistLearningService } from "./learning-service.mjs";
import { CodeSpecialistService } from "./code-specialist-service.mjs";
import { SpecialistObservability, elapsedMs, nowMs } from "./observability.mjs";
import {
  createDefaultCodeSpecialistProvider,
  createDefaultEmbeddingProvider,
  createDefaultRerankerProvider,
  createDefaultRouterModelProvider,
} from "./model-providers.mjs";

export class SpecialistOrchestrator {
  constructor(options = {}) {
    const paths = options.paths || getSpecialistPaths();
    this.paths = paths;

    const embeddingProvider = options.embeddingProvider || createDefaultEmbeddingProvider();
    const rerankerProvider = options.rerankerProvider || createDefaultRerankerProvider();
~~~