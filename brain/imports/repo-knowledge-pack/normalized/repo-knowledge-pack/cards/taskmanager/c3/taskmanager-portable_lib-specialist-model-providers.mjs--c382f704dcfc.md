---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/model-providers.mjs"
source_name: "model-providers.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 665
content_hash: "341006ea9af3f13a3557dbe2319319c3fd85d7a21c21a38c14be236daa5cb933"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "../brain-embeddings-local.mjs"
exports:
  - "createDefaultCodeSpecialistProvider"
  - "createDefaultEmbeddingProvider"
  - "createDefaultRerankerProvider"
  - "createDefaultRouterModelProvider"
---

# taskmanager/portable_lib/specialist/model-providers.mjs

> Code module; imports ../brain-embeddings-local.mjs; exports createDefaultCodeSpecialistProvider, createDefaultEmbeddingProvider, createDefaultRerankerProvider, createDefaultRouterModelProvider

## Key Signals

- Source path: taskmanager/portable_lib/specialist/model-providers.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ../brain-embeddings-local.mjs
- Exports: createDefaultCodeSpecialistProvider, createDefaultEmbeddingProvider, createDefaultRerankerProvider, createDefaultRouterModelProvider

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/model-providers.mjs

## Excerpt

~~~javascript
import { embedText } from "../brain-embeddings-local.mjs";

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function lexicalScore(queryTokens, text) {
  if (!queryTokens.length) return 0;
  const lower = String(text || "").toLowerCase();
  let hits = 0;
  for (const token of queryTokens) {
    if (lower.includes(token)) hits += 1;
  }
  return hits / queryTokens.length;
}

function cosineSimilarity(a, b) {
~~~