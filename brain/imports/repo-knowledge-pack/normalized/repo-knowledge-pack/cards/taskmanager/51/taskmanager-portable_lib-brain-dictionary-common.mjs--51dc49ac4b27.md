---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-dictionary-common.mjs"
source_name: "brain-dictionary-common.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 585
content_hash: "e0a588e7b778d06fda387d06f80b9ceb299b913f0f304d6f5fd5b05a863e805c"
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
  - "node:fs"
  - "node:path"
  - "node:url"
exports:
  - "compactDictionaryTerm"
  - "dictionaryLookupKeys"
  - "ensureWebster1913Layout"
  - "entryShardNameForTerm"
  - "getWebster1913Paths"
  - "normalizeDictionaryTerm"
  - "readJsonlFile"
  - "relFromBrain"
  - "slugifyDictionaryTerm"
  - "WEBSTER_1913_CORPUS_ID"
---

# taskmanager/portable_lib/brain-dictionary-common.mjs

> Code module; imports ./brain-build-utils.mjs, node:fs, node:path, node:url; exports compactDictionaryTerm, dictionaryLookupKeys, ensureWebster1913Layout, entryShardNameForTerm

## Key Signals

- Source path: taskmanager/portable_lib/brain-dictionary-common.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, node:fs, node:path, node:url
- Exports: compactDictionaryTerm, dictionaryLookupKeys, ensureWebster1913Layout, entryShardNameForTerm, getWebster1913Paths, normalizeDictionaryTerm

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-dictionary-common.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, normalizeSlashes } from "./brain-build-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const brainRoot = path.join(repoRoot, "brain");

export const WEBSTER_1913_CORPUS_ID = "webster-1913";
export const WEBSTER_1913_TITLE = "Webster's Revised Unabridged Dictionary (1913)";
export const WEBSTER_1913_SOURCE_URL = "https://www.gutenberg.org/cache/epub/29765/pg29765.txt";
export const WEBSTER_1913_PROJECT_URL = "https://www.gutenberg.org/ebooks/29765";

export function getWebster1913Paths() {
  const importsRoot = path.join(brainRoot, "imports", "dictionaries", WEBSTER_1913_CORPUS_ID);
  const entriesRoot = path.join(importsRoot, "entries");
  const sourceRoot = path.join(importsRoot, "source");
  const retrievalRoot = path.join(
    brainRoot,
    "retrieval",
    "indexes",
    "dictionary",
    WEBSTER_1913_CORPUS_ID
  );
  return {
    repoRoot,
    brainRoot,
~~~