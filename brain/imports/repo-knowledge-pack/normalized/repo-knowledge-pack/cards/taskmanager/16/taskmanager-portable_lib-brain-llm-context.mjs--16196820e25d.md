---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-llm-context.mjs"
source_name: "brain-llm-context.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 596
content_hash: "fc04d0f2e5c1a3a38d2453740769f2a150a6f4d712730faa113bfce09e6a1dd0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-retrieval-bm25.mjs"
  - "./brain-retrieval.mjs"
  - "node:process"
exports:
  - "gatherTopBrainSnippetsForLlm"
---

# taskmanager/portable_lib/brain-llm-context.mjs

> Code module; imports ./brain-retrieval-bm25.mjs, ./brain-retrieval.mjs, node:process; exports gatherTopBrainSnippetsForLlm

## Key Signals

- Source path: taskmanager/portable_lib/brain-llm-context.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-retrieval-bm25.mjs, ./brain-retrieval.mjs, node:process
- Exports: gatherTopBrainSnippetsForLlm

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-llm-context.mjs

## Excerpt

~~~javascript
/**
 * Optional top-BM25 snippets for local LLM grounding when there is no confident
 * user-facing retrieval hit — not shown to the user as "the answer", only as model context.
 */
import process from "node:process";
import { resolveProfileContextArtifacts } from "./brain-retrieval.mjs";
import { loadTextForBm25Chunk, rankedBm25Scores } from "./brain-retrieval-bm25.mjs";

const DEFAULT_MAX_CHUNKS = Number(process.env.LOCAL_LLM_CONTEXT_CHUNKS) || 6;
const DEFAULT_MAX_CHARS = Number(process.env.LOCAL_LLM_CONTEXT_MAX_CHARS) || 8000;

/**
 * @param {string} normalizedQuery
 * @param {string[]} extraTerms
 * @param {'default' | 'full'} scope
 * @param {{ maxChunks?: number, maxChars?: number }} [opts]
 * @returns {string}
 */
export function gatherTopBrainSnippetsForLlm(
  normalizedQuery,
  extraTerms,
  scope,
  opts = {}
) {
  const maxChunks = opts.maxChunks ?? DEFAULT_MAX_CHUNKS;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const lines = [];
  let total = 0;
~~~