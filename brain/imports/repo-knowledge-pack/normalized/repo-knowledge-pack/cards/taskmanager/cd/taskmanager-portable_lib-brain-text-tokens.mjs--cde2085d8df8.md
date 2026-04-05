---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-text-tokens.mjs"
source_name: "brain-text-tokens.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 612
content_hash: "fbc572466b76f5a2ecedd5377d4c0cd3d6c00c63376ef3e72b6523e52f3df28d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "STOP_WORDS"
  - "tokenizeForRetrieval"
---

# taskmanager/portable_lib/brain-text-tokens.mjs

> Code module; exports STOP_WORDS, tokenizeForRetrieval

## Key Signals

- Source path: taskmanager/portable_lib/brain-text-tokens.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Exports: STOP_WORDS, tokenizeForRetrieval

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-text-tokens.mjs

## Excerpt

~~~javascript
/** Shared tokenization for retrieval / BM25 builds. */
export const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "to",
  "of",
  "and",
  "or",
  "in",
  "for",
  "on",
  "with",
  "as",
  "at",
  "by",
  "this",
  "that",
  "it",
  "from",
  "what",
~~~