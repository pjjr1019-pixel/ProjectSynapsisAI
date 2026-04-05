---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-context-builder.mjs"
source_name: "brain-context-builder.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 32
selected_rank: 3386
content_hash: "531a1cab0786c72ccfd808c247a49437f448ca01f2c8277c76a0222ee0fc2c41"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "../../../portable_lib/brain-llm-context.mjs"
  - "../../../portable_lib/brain-query-normalize.mjs"
  - "../../../portable_lib/brain-retrieval-hybrid.mjs"
  - "./brain-memory-cache.mjs"
exports:
  - "async"
  - "buildCachedBrainContext"
---

# taskmanager/brain/scripts/ai-toolkit/brain-context-builder.mjs

> Script surface; imports ../../../portable_lib/brain-llm-context.mjs, ../../../portable_lib/brain-query-normalize.mjs, ../../../portable_lib/brain-retrieval-hybrid.mjs, ./brain-memory-cache.mjs; exports async, buildCachedBrainContext

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-context-builder.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 32
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Imports: ../../../portable_lib/brain-llm-context.mjs, ../../../portable_lib/brain-query-normalize.mjs, ../../../portable_lib/brain-retrieval-hybrid.mjs, ./brain-memory-cache.mjs
- Exports: async, buildCachedBrainContext

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-context-builder.mjs

## Excerpt

~~~javascript
import { rankHybridChunks } from "../../../portable_lib/brain-retrieval-hybrid.mjs";
import { gatherTopBrainSnippetsForLlm } from "../../../portable_lib/brain-llm-context.mjs";
import { prepareUserQuery } from "../../../portable_lib/brain-query-normalize.mjs";
import { createBrainMemoryCache } from "./brain-memory-cache.mjs";

const cache = createBrainMemoryCache({ namespace: "context-builder" });

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text ?? "").trim().split(/\s+/).filter(Boolean).length * 1.35));
}

function buildSourceLabel(kind, value) {
  return `${kind}:${value}`;
}

export async function buildBrainContext({ query, taskType = null, maxTokens = 1200, profileName = "repo-knowledge-pack" } = {}) {
  const prepared = prepareUserQuery(String(query ?? ""), { profileName });
  const cacheKey = `${profileName}:${taskType || "general"}:${prepared.normalized}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const maxChars = Math.max(800, Math.min(12_000, maxTokens * 4));
  const extraTerms = [taskType, ...(prepared.expandedTerms || [])].filter(Boolean);
  let ranked = null;
  try {
    ranked = await rankHybridChunks(prepared.normalized, extraTerms, { profileName, topK: 6, scope: "default" });
  } catch {
    ranked = null;
~~~