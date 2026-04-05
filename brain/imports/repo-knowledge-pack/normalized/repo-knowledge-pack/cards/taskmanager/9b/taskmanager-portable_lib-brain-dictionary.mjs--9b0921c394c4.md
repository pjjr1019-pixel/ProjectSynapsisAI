---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-dictionary.mjs"
source_name: "brain-dictionary.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 586
content_hash: "d928c12571cd953ec9c65fa90894b3567fd1488898fe6e51992bb76c92cbf9b8"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-text-tokens.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "buildDictionaryTrace"
  - "clearDictionaryCache"
  - "detectDictionaryIntent"
  - "dictionaryArtifactsAvailable"
  - "formatDictionaryReply"
  - "getDictionaryPaths"
  - "getDictionarySourceLabel"
  - "loadDictionaryAliasMap"
  - "loadDictionaryArtifactManifest"
  - "loadDictionaryBm25Artifact"
---

# taskmanager/portable_lib/brain-dictionary.mjs

> Code module; imports ./brain-text-tokens.mjs, node:fs, node:path; exports buildDictionaryTrace, clearDictionaryCache, detectDictionaryIntent, dictionaryArtifactsAvailable

## Key Signals

- Source path: taskmanager/portable_lib/brain-dictionary.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-text-tokens.mjs, node:fs, node:path
- Exports: buildDictionaryTrace, clearDictionaryCache, detectDictionaryIntent, dictionaryArtifactsAvailable, formatDictionaryReply, getDictionaryPaths

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-dictionary.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import {
  WEBSTER_1913_CORPUS_ID,
  WEBSTER_1913_TITLE,
  compactDictionaryTerm,
  dictionaryLookupKeys,
  getWebster1913Paths,
  normalizeDictionaryTerm,
  readJsonlFile,
} from "./brain-dictionary-common.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const K1 = 1.2;
const B = 0.75;

/** @type {Map<string, { mtime: number, data: any }>} */
const jsonCache = new Map();
/** @type {Map<string, { mtime: number, rows: any[] }>} */
const shardCache = new Map();

function readJsonCached(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  const cached = jsonCache.get(filePath);
  if (cached && cached.mtime === stat.mtimeMs) return cached.data;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  jsonCache.set(filePath, { mtime: stat.mtimeMs, data: parsed });
~~~