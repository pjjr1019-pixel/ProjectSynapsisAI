---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-review-log.mjs"
source_name: "brain-review-log.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 607
content_hash: "786220077a15c7e44b45a39961774239fa2d5786bb1a285f962fff90e95ce318"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-runtime-hub.mjs"
  - "node:crypto"
  - "node:fs"
  - "node:path"
  - "node:process"
exports:
  - "appendReviewLog"
---

# taskmanager/portable_lib/brain-review-log.mjs

> Code module; imports ./brain-runtime-hub.mjs, node:crypto, node:fs, node:path; exports appendReviewLog

## Key Signals

- Source path: taskmanager/portable_lib/brain-review-log.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-hub.mjs, node:crypto, node:fs, node:path, node:process
- Exports: appendReviewLog

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-review-log.mjs

## Excerpt

~~~javascript
/**
 * Append-only JSONL logs under brain/runtime/logs/chat-turns/ for human review (not auto-promoted to scenarios).
 *
 * Env: REVIEW_LOG_ENABLED — default 1; set to 0, false, off to disable writes.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { ensureBrainRuntimeHub, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

function enabled() {
  const v = String(process.env.REVIEW_LOG_ENABLED ?? "1").toLowerCase();
  return !["0", "false", "off", "no"].includes(v);
}

/**
 * @param {{
 *   sessionId?: string,
 *   userMessage: string,
 *   draftSource: string,
 *   draftPreview: string,
 *   finalReply: string,
 *   localLlm: boolean,
 *   llmMode: string | null,
 *   model: string | null,
 *   turnSeq: number,
 *   error?: string,
~~~