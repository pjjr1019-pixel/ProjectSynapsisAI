---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-retrieval-hybrid.mjs"
source_name: "brain-retrieval-hybrid.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 94
selected_rank: 574
content_hash: "bb064f8f289591ae9fd017335707beb3cfd104496a65ad69395d1c856b9fdb0a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-embeddings-local.mjs"
  - "./brain-retrieval-bm25.mjs"
  - "./brain-retrieval-dense-lancedb.mjs"
  - "./brain-retrieval.mjs"
  - "node:fs"
  - "node:path"
  - "node:process"
exports:
  - "async"
  - "reciprocalRankFusion"
---

# taskmanager/portable_lib/brain-retrieval-hybrid.mjs

> Code module; imports ./brain-embeddings-local.mjs, ./brain-retrieval-bm25.mjs, ./brain-retrieval-dense-lancedb.mjs, ./brain-retrieval.mjs; exports async, reciprocalRankFusion

## Key Signals

- Source path: taskmanager/portable_lib/brain-retrieval-hybrid.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 94
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-embeddings-local.mjs, ./brain-retrieval-bm25.mjs, ./brain-retrieval-dense-lancedb.mjs, ./brain-retrieval.mjs, node:fs, node:path
- Exports: async, reciprocalRankFusion

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-retrieval-hybrid.mjs

## Excerpt

~~~javascript
/**
 * Ranked hybrid retrieval with optional legacy embedding fusion and optional LanceDB dense pilot.
 * Falls back to BM25-only when dense lanes are unavailable.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { rankedBm25Scores } from "./brain-retrieval-bm25.mjs";
import { densePilotRequested } from "./brain-embeddings-local.mjs";
import { retrieveDensePilot } from "./brain-retrieval-dense-lancedb.mjs";
import { getRepoRoot } from "./brain-retrieval.mjs";

const BUILD_DIR = path.join(
  getRepoRoot(),
  "brain",
  "apps",
  "assistant",
  "knowledge",
  "build"
);
const EMBED_DEFAULT = "retrieval-embeddings.json";
const EMBED_FULL = "retrieval-embeddings-full.json";
const DEFAULT_RRF_K = 60;

/** @type {Map<string, { mtime: number, data: object }>} */
const embCache = new Map();

/** @param {'default' | 'full'} scope */
~~~