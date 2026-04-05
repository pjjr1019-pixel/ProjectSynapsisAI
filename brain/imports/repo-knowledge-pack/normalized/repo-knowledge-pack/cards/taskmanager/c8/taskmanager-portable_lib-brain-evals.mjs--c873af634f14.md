---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-evals.mjs"
source_name: "brain-evals.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 589
content_hash: "8c6d61d0c7eeacec3471b37db7f0046fb7924184b957b42e14888aefdccf7640"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-chat-reply.mjs"
  - "./brain-retrieval-dense-lancedb.mjs"
  - "./brain-runtime-layer.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "async"
---

# taskmanager/portable_lib/brain-evals.mjs

> Code module; imports ./brain-chat-reply.mjs, ./brain-retrieval-dense-lancedb.mjs, ./brain-runtime-layer.mjs, node:fs; exports async

## Key Signals

- Source path: taskmanager/portable_lib/brain-evals.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-chat-reply.mjs, ./brain-retrieval-dense-lancedb.mjs, ./brain-runtime-layer.mjs, node:fs, node:path
- Exports: async

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-evals.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  ensureDir,
  readJsonIfExists,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { traceBrainMatch } from "./brain-chat-reply.mjs";
import { densePilotReady } from "./brain-retrieval-dense-lancedb.mjs";
import { getBrainRuntimePaths, loadRuntimeManifest } from "./brain-runtime-layer.mjs";

const PATHS = getBrainRuntimePaths();
const EVAL_CASES_PATH = path.join(PATHS.brainRoot, "evals", "retrieval-eval-cases.json");
const GENERATED_EVALS_ROOT = PATHS.generatedEvalsRoot;

function loadCasesFromFile(filePath) {
  const raw = readJsonIfExists(filePath);
  return Array.isArray(raw?.cases) ? raw.cases : [];
}

function loadEvalCases() {
  const cases = [];
  cases.push(...loadCasesFromFile(EVAL_CASES_PATH));
  if (fs.existsSync(GENERATED_EVALS_ROOT)) {
    const files = fs
      .readdirSync(GENERATED_EVALS_ROOT)
~~~