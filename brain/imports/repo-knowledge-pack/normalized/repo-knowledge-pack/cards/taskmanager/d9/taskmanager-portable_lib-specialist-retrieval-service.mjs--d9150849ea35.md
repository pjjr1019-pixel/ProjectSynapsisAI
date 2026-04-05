---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/retrieval-service.mjs"
source_name: "retrieval-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 623
content_hash: "f1d45fd4ac5287b9d42f7fa637c4bab24a3907b4f61ce6102a2ab0f6b147598e"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "../brain-bm25.mjs"
exports:
  - "ScriptRetrievalService"
---

# taskmanager/portable_lib/specialist/retrieval-service.mjs

> Code module; imports ../brain-bm25.mjs; exports ScriptRetrievalService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/retrieval-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ../brain-bm25.mjs
- Exports: ScriptRetrievalService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/retrieval-service.mjs

## Excerpt

~~~javascript
import { bm25Score } from "../brain-bm25.mjs";

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) tf[token] = (tf[token] || 0) + 1;
  return tf;
}

function textBlob(manifest) {
  return [
    manifest.id,
    manifest.title,
    manifest.description,
    manifest.category,
    ...(manifest.aliases || []),
    ...(manifest.tags || []),
    JSON.stringify(manifest.inputs || {}),
    JSON.stringify(manifest.usage_examples || []),
  ].join(" ");
~~~