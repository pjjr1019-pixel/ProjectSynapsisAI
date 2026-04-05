---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-runtime-layer.mjs"
source_name: "brain-runtime-layer.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3436
content_hash: "77cba83c6042e88142e38c9ebe3d317853515caec93953ff14429eb062a38834"
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
  - "./brain-text-tokens.mjs"
  - "./taskmanager-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "clearBrainRuntimeCache"
  - "expandQueryWithSemanticMap"
  - "getBrainRuntimeIndexesRoot"
  - "getBrainRuntimePaths"
  - "getBrainRuntimeRoot"
  - "getProfileArtifactPath"
  - "loadAllNormalizedDocs"
  - "loadNormalizedDoc"
  - "loadPreviousRuntimeManifest"
  - "loadProfileBm25Artifact"
---

# taskmanager/portable_lib/brain-runtime-layer.mjs

> Code module; imports ./brain-ir-contracts.mjs, ./brain-text-tokens.mjs, ./taskmanager-paths.mjs, node:fs; exports clearBrainRuntimeCache, expandQueryWithSemanticMap, getBrainRuntimeIndexesRoot, getBrainRuntimePaths

## Key Signals

- Source path: taskmanager/portable_lib/brain-runtime-layer.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-ir-contracts.mjs, ./brain-text-tokens.mjs, ./taskmanager-paths.mjs, node:fs, node:path
- Exports: clearBrainRuntimeCache, expandQueryWithSemanticMap, getBrainRuntimeIndexesRoot, getBrainRuntimePaths, getBrainRuntimeRoot, getProfileArtifactPath

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-runtime-layer.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  normalizeSlashes,
  sha256File,
  uniqueSorted,
} from "./brain-build-utils.mjs";
import {
  dictionaryArtifactsAvailable,
  loadDictionaryArtifactManifest,
  loadDictionaryBm25Artifact,
  loadDictionaryHeadwordMap,
  loadDictionaryAliasMap,
  loadDictionaryStats,
} from "./brain-dictionary.mjs";
import { normalizeProfileDefinition } from "./brain-ir-contracts.mjs";
import { getTaskmanagerPaths, resolveExistingPath } from "./taskmanager-paths.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const taskmanagerPaths = getTaskmanagerPaths();
const repoRoot = taskmanagerPaths.taskmanagerRoot;
const brainRoot = taskmanagerPaths.brain.root;
const retrievalRoot = taskmanagerPaths.brain.retrieval.root;
const indexesRoot = taskmanagerPaths.brain.retrieval.indexesRoot;
const profilesPath = taskmanagerPaths.brain.retrieval.profilesFile;
~~~