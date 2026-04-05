---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-retrieval-bm25.mjs"
source_name: "brain-retrieval-bm25.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 94
selected_rank: 572
content_hash: "45bec0b4b48cde3b9325fc6fc9639a82a6ccc7befa2971e31f207d6f33663c4e"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-retrieval.mjs"
  - "./brain-runtime-layer.mjs"
  - "./brain-text-tokens.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "bestBm25Chunk"
  - "bm25IndexFileExists"
  - "loadBm25Index"
  - "loadTextForBm25Chunk"
  - "rankedBm25Scores"
  - "rankQueryTermsByBm25Importance"
---

# taskmanager/portable_lib/brain-retrieval-bm25.mjs

> Code module; imports ./brain-retrieval.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs, node:fs; exports bestBm25Chunk, bm25IndexFileExists, loadBm25Index, loadTextForBm25Chunk

## Key Signals

- Source path: taskmanager/portable_lib/brain-retrieval-bm25.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 94
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-retrieval.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs, node:fs, node:path
- Exports: bestBm25Chunk, bm25IndexFileExists, loadBm25Index, loadTextForBm25Chunk, rankedBm25Scores, rankQueryTermsByBm25Importance

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-retrieval-bm25.mjs

## Excerpt

~~~javascript
/**
 * BM25 + inverted index over brain chunks (offline-built JSON).
 *
 * Default artifact: retrieval-bm25.json (repo-knowledge-pack profile build).
 * Optional whole-brain artifact: retrieval-bm25-full.json (e.g. dev-all-drafts profile).
 */
import fs from "node:fs";
import path from "node:path";
import { findChunkByChunkId, getRepoRoot, loadChunkText } from "./brain-retrieval.mjs";
import { expandQueryWithSemanticMap, loadProfileBm25Artifact } from "./brain-runtime-layer.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const K1 = 1.2;
const B = 0.75;

const FILE_DEFAULT = "retrieval-bm25.json";
const FILE_FULL = "retrieval-bm25-full.json";

/** @param {'default' | 'full'} scope */
function indexPathForScope(scope) {
  const name = scope === "full" ? FILE_FULL : FILE_DEFAULT;
  return path.join(getRepoRoot(), "brain", "apps", "assistant", "knowledge", "build", name);
}

/** @type {Map<string, { mtime: number, data: object }>} */
const cache = new Map();

let warnedFullMissing = false;
~~~