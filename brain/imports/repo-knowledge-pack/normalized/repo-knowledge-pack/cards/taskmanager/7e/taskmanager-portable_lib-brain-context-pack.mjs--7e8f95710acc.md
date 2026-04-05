---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-context-pack.mjs"
source_name: "brain-context-pack.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 583
content_hash: "440a03eff985d0ca059a28aab01503fcb5ce6234b264968a30466ca68aa2f139"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-query-normalize.mjs"
  - "./brain-retrieval-bm25.mjs"
  - "./brain-retrieval.mjs"
  - "./brain-scenario-lookup.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "buildContextPack"
  - "inspectContextPack"
---

# taskmanager/portable_lib/brain-context-pack.mjs

> Code module; imports ./brain-query-normalize.mjs, ./brain-retrieval-bm25.mjs, ./brain-retrieval.mjs, ./brain-scenario-lookup.mjs; exports buildContextPack, inspectContextPack

## Key Signals

- Source path: taskmanager/portable_lib/brain-context-pack.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-query-normalize.mjs, ./brain-retrieval-bm25.mjs, ./brain-retrieval.mjs, ./brain-scenario-lookup.mjs, node:fs, node:path
- Exports: buildContextPack, inspectContextPack

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-context-pack.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  ensureDir,
  normalizeSlashes,
  sha256Text,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { prepareUserQuery } from "./brain-query-normalize.mjs";
import { loadTextForBm25Chunk, rankedBm25Scores } from "./brain-retrieval-bm25.mjs";
import { getProfileConfig } from "./brain-retrieval.mjs";
import {
  getBrainRuntimePaths,
  loadNormalizedDoc,
  lookupCompactFacts,
  lookupSummaryMatches,
} from "./brain-runtime-layer.mjs";
import { lookupScenarioCandidates } from "./brain-scenario-lookup.mjs";

function estimateTokens(text) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return Math.max(1, Math.ceil(words.length * 1.35));
}
~~~