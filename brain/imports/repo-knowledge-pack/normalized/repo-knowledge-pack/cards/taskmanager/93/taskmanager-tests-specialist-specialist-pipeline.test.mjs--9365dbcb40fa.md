---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/tests/specialist/specialist-pipeline.test.mjs"
source_name: "specialist-pipeline.test.mjs"
top_level: "taskmanager"
surface: "tests"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 38
selected_rank: 3384
content_hash: "37e0ae282166fabdbd5555a08516591f088629e0c26b34d57928771b5c537f59"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
  - "tests"
imports:
  - "../../portable_lib/specialist/code-specialist-service.mjs"
  - "../../portable_lib/specialist/contracts.mjs"
  - "../../portable_lib/specialist/embedding-service.mjs"
  - "../../portable_lib/specialist/execution-service.mjs"
  - "../../portable_lib/specialist/index-service.mjs"
  - "../../portable_lib/specialist/learning-service.mjs"
  - "../../portable_lib/specialist/orchestrator.mjs"
  - "../../portable_lib/specialist/rerank-service.mjs"
  - "../../portable_lib/specialist/retrieval-service.mjs"
  - "../../portable_lib/specialist/router-service.mjs"
---

# taskmanager/tests/specialist/specialist-pipeline.test.mjs

> Code module; imports ../../portable_lib/specialist/code-specialist-service.mjs, ../../portable_lib/specialist/contracts.mjs, ../../portable_lib/specialist/embedding-service.mjs, ../../portable_lib/specialist/execution-service.mjs

## Key Signals

- Source path: taskmanager/tests/specialist/specialist-pipeline.test.mjs
- Surface: tests
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 38
- Tags: code, mjs, neutral, scripts, tests
- Imports: ../../portable_lib/specialist/code-specialist-service.mjs, ../../portable_lib/specialist/contracts.mjs, ../../portable_lib/specialist/embedding-service.mjs, ../../portable_lib/specialist/execution-service.mjs, ../../portable_lib/specialist/index-service.mjs, ../../portable_lib/specialist/learning-service.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, mjs, neutral, scripts, taskmanager, tests
- Source link target: taskmanager/tests/specialist/specialist-pipeline.test.mjs

## Excerpt

~~~javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ScriptIndexService } from "../../portable_lib/specialist/index-service.mjs";
import { ScriptEmbeddingService } from "../../portable_lib/specialist/embedding-service.mjs";
import { ScriptRetrievalService } from "../../portable_lib/specialist/retrieval-service.mjs";
import { ScriptRerankService } from "../../portable_lib/specialist/rerank-service.mjs";
import { ScriptRouterService } from "../../portable_lib/specialist/router-service.mjs";
import { ScriptExecutionService } from "../../portable_lib/specialist/execution-service.mjs";
import { SpecialistLearningService } from "../../portable_lib/specialist/learning-service.mjs";
import { CodeSpecialistService } from "../../portable_lib/specialist/code-specialist-service.mjs";
import { SpecialistOrchestrator } from "../../portable_lib/specialist/orchestrator.mjs";
import { EXECUTION_POLICIES } from "../../portable_lib/specialist/contracts.mjs";

function tempPaths() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "specialist-"));
  const taskmanagerRoot = root;
  const brainRoot = path.join(root, "brain");
  const scriptsRoot = path.join(brainRoot, "scripts");
  const registryRoot = path.join(scriptsRoot, "registry");
  const newSkillsRoot = path.join(scriptsRoot, "new-skills");
  const specialistRoot = path.join(brainRoot, "runtime", "specialist");
  const indexRoot = path.join(specialistRoot, "index");
  const logsRoot = path.join(brainRoot, "runtime", "logs", "specialist");
  fs.mkdirSync(registryRoot, { recursive: true });
~~~