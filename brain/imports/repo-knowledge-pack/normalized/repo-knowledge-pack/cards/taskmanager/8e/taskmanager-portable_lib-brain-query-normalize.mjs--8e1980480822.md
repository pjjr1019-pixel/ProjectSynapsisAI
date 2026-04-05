---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-query-normalize.mjs"
source_name: "brain-query-normalize.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 601
content_hash: "9a95879d3cd5331a5a79438960f06b9f8f02ceb31c0eeba34a58f8accaf8202e"
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
  - "node:fs"
  - "node:path"
exports:
  - "applySynonyms"
  - "loadSynonymMap"
  - "normalizeWhitespace"
  - "prepareUserQuery"
---

# taskmanager/portable_lib/brain-query-normalize.mjs

> Code module; imports ./brain-retrieval.mjs, ./brain-runtime-layer.mjs, node:fs, node:path; exports applySynonyms, loadSynonymMap, normalizeWhitespace, prepareUserQuery

## Key Signals

- Source path: taskmanager/portable_lib/brain-query-normalize.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-retrieval.mjs, ./brain-runtime-layer.mjs, node:fs, node:path
- Exports: applySynonyms, loadSynonymMap, normalizeWhitespace, prepareUserQuery

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-query-normalize.mjs

## Excerpt

~~~javascript
/**
 * Normalize user text for matching: spacing, fillers, optional synonym expansion.
 */
import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "./brain-retrieval.mjs";
import { expandQueryWithSemanticMap, loadRuntimeSynonyms } from "./brain-runtime-layer.mjs";

const FILLER_RE =
  /^(?:um+|uh+|er+|ah+|like|so|well|ok(?:ay)?|please)[,.\s]+/gi;

/** @type {{ mtime: number, map: Map<string, string> } | null} */
let synCache = null;

function synonymsPath() {
  return path.join(
    getRepoRoot(),
    "brain",
    "apps",
    "assistant",
    "knowledge",
    "synonyms.json"
  );
}

export function loadSynonymMap() {
  const runtime = loadRuntimeSynonyms();
  if (runtime?.synonyms && typeof runtime.synonyms === "object") {
~~~