---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-profile-retrieval-shaping.mjs"
source_name: "brain-profile-retrieval-shaping.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 94
selected_rank: 571
content_hash: "33894c6345046bf18f9f25c5603cb7cfcf3bb5cb0af46c748811a578286a7b14"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-runtime-layer.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "getCompactedMemoryPath"
  - "loadCompactedMemory"
  - "shapeRetrievalByProfile"
---

# taskmanager/portable_lib/brain-profile-retrieval-shaping.mjs

> Code module; imports ./brain-runtime-layer.mjs, node:fs, node:path; exports getCompactedMemoryPath, loadCompactedMemory, shapeRetrievalByProfile

## Key Signals

- Source path: taskmanager/portable_lib/brain-profile-retrieval-shaping.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 94
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-layer.mjs, node:fs, node:path
- Exports: getCompactedMemoryPath, loadCompactedMemory, shapeRetrievalByProfile

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-profile-retrieval-shaping.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";

const MEMORY_COMPACT_ROOT = path.join(getBrainRuntimePaths().brainRoot, "memory", "user", "compacted");

export function getCompactedMemoryPath(userId) {
  return path.join(MEMORY_COMPACT_ROOT, `${String(userId ?? "").trim()}.json`);
}

export function loadCompactedMemory(userId) {
  const filePath = getCompactedMemoryPath(userId);
  if (!userId || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function shapeRetrievalByProfile(profile, opts = {}) {
  const memory = opts.userId ? loadCompactedMemory(opts.userId) : null;
  const expertise = String(memory?.profile?.expertise || opts.expertise || "").toLowerCase();
  const base = {
    bm25Weight: 0.5,
    denseWeight: 0.5,
    topK: 6,
    summaryBias: profile?.summaryFirst !== false ? 1 : 0.85,
  };
  if (expertise === "expert") {
    return { ...base, bm25Weight: 0.45, denseWeight: 0.55, topK: 5, summaryBias: 0.9 };
  }
~~~