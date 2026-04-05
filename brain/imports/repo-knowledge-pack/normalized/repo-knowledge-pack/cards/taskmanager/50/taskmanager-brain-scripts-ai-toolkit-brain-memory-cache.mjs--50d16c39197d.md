---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-memory-cache.mjs"
source_name: "brain-memory-cache.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 124
content_hash: "cdebf8e73360cf8db8cd56f5e7988137f5026464a3b64f2abb8e7e1c89969ca6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "../../../portable_lib/brain-session-store.mjs"
exports:
  - "createBrainMemoryCache"
  - "createSharedBrainMemoryCache"
---

# taskmanager/brain/scripts/ai-toolkit/brain-memory-cache.mjs

> Script surface; imports ../../../portable_lib/brain-session-store.mjs; exports createBrainMemoryCache, createSharedBrainMemoryCache

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-memory-cache.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Imports: ../../../portable_lib/brain-session-store.mjs
- Exports: createBrainMemoryCache, createSharedBrainMemoryCache

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-memory-cache.mjs

## Excerpt

~~~javascript
import { getSessionHints, updateSessionHints } from "../../../portable_lib/brain-session-store.mjs";

function now() {
  return Date.now();
}

function keyFor(ns, key) {
  return `${String(ns || "default")}:${String(key)}`;
}

function compactSnapshot(entries) {
  return entries.map(([cacheKey, item]) => [cacheKey, { value: item.value, expiresAt: item.expiresAt }]);
}

export function createBrainMemoryCache({ namespace = "brain", sessionId = null } = {}) {
  const store = new Map();

  function cleanupExpired() {
    const stamp = now();
    for (const [cacheKey, item] of store.entries()) {
      if (item.expiresAt !== null && item.expiresAt <= stamp) {
        store.delete(cacheKey);
      }
    }
  }

  function persist() {
    if (!sessionId) return;
~~~