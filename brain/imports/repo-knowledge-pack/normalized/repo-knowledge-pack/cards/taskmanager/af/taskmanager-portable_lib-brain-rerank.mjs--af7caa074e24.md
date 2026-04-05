---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-rerank.mjs"
source_name: "brain-rerank.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 605
content_hash: "5d2aa5a6d69aa080b049273b1a9058887546c101e86ebf329f74301d14fcc8a6"
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
  - "./brain-text-tokens.mjs"
exports:
  - "async"
---

# taskmanager/portable_lib/brain-rerank.mjs

> Code module; imports ./brain-embeddings-local.mjs, ./brain-retrieval-bm25.mjs, ./brain-text-tokens.mjs; exports async

## Key Signals

- Source path: taskmanager/portable_lib/brain-rerank.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-embeddings-local.mjs, ./brain-retrieval-bm25.mjs, ./brain-text-tokens.mjs
- Exports: async

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-rerank.mjs

## Excerpt

~~~javascript
import { loadTextForBm25Chunk } from "./brain-retrieval-bm25.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { embedText } from "./brain-embeddings-local.mjs";

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function lexicalOverlap(queryTerms, text) {
  if (!queryTerms.length || !text) return 0;
  const haystack = String(text).toLowerCase();
  let hits = 0;
  for (const term of queryTerms) {
    if (haystack.includes(term)) hits += 1;
  }
  return hits / queryTerms.length;
}

function normalizeRetrievalSignal(candidate) {
  const rrf = Number(candidate.rrfScoreNormalized ?? candidate.retrievalSignal ?? 0);
  const bm25 = Math.min(1, Number(candidate.bm25Score || 0));
  const dense = Math.min(1, Number(candidate.denseScore || candidate.legacyDenseScore || 0));
  return Math.max(rrf, bm25, dense);
}
~~~