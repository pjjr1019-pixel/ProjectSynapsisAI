---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-drift-detector.mjs"
source_name: "brain-drift-detector.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 587
content_hash: "9865848a2b7bf10cbe7e5980abee0b07a3ad1d985967748d17de51f37a485409"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-ir-contracts.mjs"
  - "./brain-retrieval.mjs"
  - "node:path"
exports:
  - "detectBrainDrift"
---

# taskmanager/portable_lib/brain-drift-detector.mjs

> Code module; imports ./brain-ir-contracts.mjs, ./brain-retrieval.mjs, node:path; exports detectBrainDrift

## Key Signals

- Source path: taskmanager/portable_lib/brain-drift-detector.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-ir-contracts.mjs, ./brain-retrieval.mjs, node:path
- Exports: detectBrainDrift

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-drift-detector.mjs

## Excerpt

~~~javascript
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  readJsonIfExists,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { normalizeProfileDefinition } from "./brain-ir-contracts.mjs";
import { loadProfiles } from "./brain-retrieval.mjs";
import {
  getBrainRuntimePaths,
  loadAllNormalizedDocs,
  loadPreviousRuntimeManifest,
  loadProfileRetrievalMap,
  loadRuntimeCompactFacts,
  loadRuntimeManifest,
} from "./brain-runtime-layer.mjs";

function issue(severity, code, message, extra = {}) {
  return { severity, code, message, ...extra };
}

function meaningKey(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[`*_#>\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
~~~