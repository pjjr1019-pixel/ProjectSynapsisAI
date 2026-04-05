---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-retrieval-dense-lancedb.mjs"
source_name: "brain-retrieval-dense-lancedb.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 94
selected_rank: 573
content_hash: "751641725ed8a7ad7dd799833768ec2f34cd9fffd84ed83ae1db1f5a5ac82751"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-embeddings-local.mjs"
  - "./brain-runtime-layer.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "async"
  - "densePilotReady"
  - "loadDensePilotManifest"
---

# taskmanager/portable_lib/brain-retrieval-dense-lancedb.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-embeddings-local.mjs, ./brain-runtime-layer.mjs, node:fs; exports async, densePilotReady, loadDensePilotManifest

## Key Signals

- Source path: taskmanager/portable_lib/brain-retrieval-dense-lancedb.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 94
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-embeddings-local.mjs, ./brain-runtime-layer.mjs, node:fs, node:path
- Exports: async, densePilotReady, loadDensePilotManifest

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-retrieval-dense-lancedb.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { readJsonIfExists } from "./brain-build-utils.mjs";
import { embedText, getDensePilotSettings } from "./brain-embeddings-local.mjs";
import {
  chunkMatchesProfile,
  findChunkByChunkId,
  getProfileConfig,
} from "./brain-retrieval.mjs";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";

const MANIFEST_PATH = path.join(getBrainRuntimePaths().indexesRoot, "dense-pilot-manifest.json");
let lancedbPromise = null;

function toDenseScore(row) {
  const distance = Number(row?._distance ?? row?.distance ?? Number.NaN);
  if (Number.isFinite(distance)) {
    return 1 / (1 + Math.max(0, distance));
  }
  const score = Number(row?.score ?? 0);
  if (Number.isFinite(score)) return Math.max(0, Math.min(1, score));
  return 0;
}

async function loadLanceDb() {
  if (!lancedbPromise) {
    lancedbPromise = import("@lancedb/lancedb").catch((error) => {
      lancedbPromise = null;
~~~