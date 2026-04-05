---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-retrieval.mjs"
source_name: "brain-retrieval.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 94
selected_rank: 575
content_hash: "77b3a54256cbd8515286c9962c410e8cf193d3c81e9cb949e74eb6a5050a6036"
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
  - "./taskmanager-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "chunkMatchesProfile"
  - "clearBrainRetrievalCache"
  - "clearChunkByIdCache"
  - "findChunkByChunkId"
  - "getProfileConfig"
  - "getRepoRoot"
  - "loadChunksJsonl"
  - "loadChunkText"
  - "loadProfiles"
  - "resolveChunksForProfile"
---

# taskmanager/portable_lib/brain-retrieval.mjs

> Code module; imports ./brain-ir-contracts.mjs, ./taskmanager-paths.mjs, node:fs, node:path; exports chunkMatchesProfile, clearBrainRetrievalCache, clearChunkByIdCache, findChunkByChunkId

## Key Signals

- Source path: taskmanager/portable_lib/brain-retrieval.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 94
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-ir-contracts.mjs, ./taskmanager-paths.mjs, node:fs, node:path
- Exports: chunkMatchesProfile, clearBrainRetrievalCache, clearChunkByIdCache, findChunkByChunkId, getProfileConfig, getRepoRoot

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-retrieval.mjs

## Excerpt

~~~javascript
/**
 * Reference loader + filter for brain/retrieval/indexes/chunks.jsonl
 * See brain/retrieval/profiles.json
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeProfileDefinition } from "./brain-ir-contracts.mjs";
import {
  loadProfileRetrievalMap,
  lookupCompactFacts,
  lookupSummaryMatches,
} from "./brain-runtime-layer.mjs";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();
const repoRoot = taskmanagerPaths.taskmanagerRoot;
const brain = taskmanagerPaths.brain.root;
const chunksPath = taskmanagerPaths.brain.retrieval.chunksFile;
const profilesPath = taskmanagerPaths.brain.retrieval.profilesFile;

/** @type {{ mtime: number, lines: object[] } | null} */
let chunksCache = null;
/** @type {{ mtime: number, data: object } | null} */
let profilesCache = null;
/** @type {Map<string, object> | null} */
let chunkByIdCache = null;
const SUPPORTED_SOURCE_TYPES = new Set(["canonical", "runtime", "web", "draft", "import", "memory"]);
~~~