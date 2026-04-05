---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-chat-reply.mjs"
source_name: "brain-chat-reply.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 581
content_hash: "15353a207efc68c2ac6304992d439daeaeaa49ffc55b28903d5f638fe46a8cc3"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-arbitration.mjs"
  - "./brain-calculator.mjs"
  - "./brain-context-pack.mjs"
  - "./brain-dictionary.mjs"
  - "./brain-idle-training.mjs"
  - "./brain-llm-context.mjs"
  - "./brain-query-decompose.mjs"
  - "./brain-query-expand.mjs"
  - "./brain-query-normalize.mjs"
  - "./brain-quick-greetings.mjs"
exports:
  - "sanitizeAttachments"
---

# taskmanager/portable_lib/brain-chat-reply.mjs

> Code module; imports ./brain-arbitration.mjs, ./brain-calculator.mjs, ./brain-context-pack.mjs, ./brain-dictionary.mjs; exports sanitizeAttachments

## Key Signals

- Source path: taskmanager/portable_lib/brain-chat-reply.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-arbitration.mjs, ./brain-calculator.mjs, ./brain-context-pack.mjs, ./brain-dictionary.mjs, ./brain-idle-training.mjs, ./brain-llm-context.mjs
- Exports: sanitizeAttachments

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-chat-reply.mjs

## Excerpt

~~~javascript
/**
 * Chat reply pipeline (local-first, no network for core path):
 *
 * 1. Normalize query + synonyms
 * 2. Quick exact intents (hi, help, …) — before scenario/BM25 so short queries never hit retrieval
 * 2b. Internal calculator (expr-eval) — arithmetic-only messages before scenario/retrieval
 * 3. Scenario index (Aho–Corasick) + exclusions
 * 4. Fuzzy single-token triggers (edit distance <= 1)
 * 5. BM25 + inverted index over brain chunks (optional index file)
 * 6. Session hints (last turn) boost retrieval
 * 7. Slot hints (tickers, etc.)
 * 8. Clarification when confidence is low (no AI) — or explicit IDK when local LLM is enabled
 * 9. Optional local LLM: fallback | refine | always (brain-local-llm.mjs); when on, every reply is
 *    passed through a variation/refine step so consecutive assistant messages are not verbatim duplicates.
 *
 * opts:
 *   sessionId — session hint key
 *   localLlm — if false, skip all local LLM calls for this request (non-LLM draft only)
 *   fullBrainContext — if true, use retrieval-bm25-full.json when present and dev-all-drafts lexical fallback
 *   attachments — optional [{ name: string, text: string }] merged into the user turn (capped)
 *   internet — if true with local LLM + a configured provider, fetch web snippets (server may rate-limit or disable via env)
 *   internetClientKey — optional rate-limit key (e.g. IP:sessionId) from the HTTP server
 *
 * Env (dev):
 *   HORIZONS_CHAT_DEBUG_TIMING=1 — stderr timings for draft + LLM stages
 *   HORIZONS_LEARNED_QA=0 — disable appending successful LLM replies to learned-qa.jsonl
 */
import process from "node:process";
~~~