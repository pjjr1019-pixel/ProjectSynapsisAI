---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-session-store.mjs"
source_name: "brain-session-store.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 610
content_hash: "cf9f72d720082aa7fd84de838dfdf8bf06af1ad2d837e0d3f7e43b732d8c4328"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "getSessionHints"
  - "recordAssistantReply"
  - "updateSessionHints"
---

# taskmanager/portable_lib/brain-session-store.mjs

> Code module; exports getSessionHints, recordAssistantReply, updateSessionHints

## Key Signals

- Source path: taskmanager/portable_lib/brain-session-store.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Exports: getSessionHints, recordAssistantReply, updateSessionHints

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-session-store.mjs

## Excerpt

~~~javascript
/** In-memory session hints for follow-up turns (per chat session id). */

/** @type {Map<string, { lastNormalized: string | null, lastSource: string | null, lastAssistantText: string | null, turnSeq: number }>} */
const store = new Map();
const MAX_SESSIONS = 5000;

/**
 * @param {string | undefined} sessionId
 */
export function getSessionHints(sessionId) {
  if (!sessionId) {
    return { lastNormalized: null, lastSource: null, lastAssistantText: null, turnSeq: 0 };
  }
  return (
    store.get(sessionId) || {
      lastNormalized: null,
      lastSource: null,
      lastAssistantText: null,
      turnSeq: 0,
    }
  );
}

/**
 * @param {string | undefined} sessionId
 * @param {{ lastNormalized?: string | null, lastSource?: string | null, lastAssistantText?: string | null, turnSeq?: number }} patch
 */
export function updateSessionHints(sessionId, patch) {
~~~