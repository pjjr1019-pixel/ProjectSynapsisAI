---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-local-llm.mjs"
source_name: "brain-local-llm.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 597
content_hash: "2a80bb966916501e1f8a4dc3a6a993af54c96b7e8767aea514f72f4d4ffd8741"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./provider-usage-telemetry.mjs"
  - "node:process"
exports:
  - "async"
  - "getLocalLlmConfig"
---

# taskmanager/portable_lib/brain-local-llm.mjs

> Code module; imports ./provider-usage-telemetry.mjs, node:process; exports async, getLocalLlmConfig

## Key Signals

- Source path: taskmanager/portable_lib/brain-local-llm.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./provider-usage-telemetry.mjs, node:process
- Exports: async, getLocalLlmConfig

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-local-llm.mjs

## Excerpt

~~~javascript
/**
 * Optional local LLM via OpenAI-compatible Chat Completions (Ollama, LM Studio, vLLM, etc.).
 *
 * Suggested models (Ollama names, RAM hints): see brain/core/recommended-local-llm-models.md
 *
 * Env:
 *   LOCAL_LLM_BASE_URL — e.g. http://127.0.0.1:11434/v1 (Ollama) or http://127.0.0.1:1234/v1
 *   LOCAL_LLM_MODEL    — e.g. llama3.2 (see recommended-local-llm-models.md)
 *   LOCAL_LLM_API_KEY  — optional (LM Studio / some gateways)
 *   LOCAL_LLM_MODE     — fallback | refine | always | off   (default: fallback when URL+model set)
 *                        - fallback: LLM only when scenario + retrieval both miss
 *                        - refine:   non-LLM draft first (scenario → retrieval → clarify → fallback), then polish via LLM
 *                        - always:   LLM every turn; scenario/retrieval passed as context (model may paraphrase heavily)
 *                        - off:      disabled via mode (same as unset URL/model for gating)
 *   LOCAL_LLM_TIMEOUT_MS — default 120000
 *   LOCAL_LLM_REFINE_TEMPERATURE — default 0.2 (lower = closer to draft)
 *   LOCAL_LLM_VARY_TEMPERATURE — used when paraphrasing must differ from the previous assistant
 *     reply (default 0.28, capped at 0.5)
 *   LOCAL_LLM_CONTEXT_CHUNKS — max BM25 chunks to pass as optional brain context (default 6)
 *   LOCAL_LLM_CONTEXT_MAX_CHARS — cap for that context block (default 8000)
 *
 * Aliases: OLLAMA_HOST (e.g. http://127.0.0.1:11434) + OLLAMA_MODEL if LOCAL_LLM_* unset.
 *
 * Optional call options (brain-chat-reply): webAugmented — append web-snippet safety instructions to system prompts.
 */
import process from "node:process";

import {
~~~