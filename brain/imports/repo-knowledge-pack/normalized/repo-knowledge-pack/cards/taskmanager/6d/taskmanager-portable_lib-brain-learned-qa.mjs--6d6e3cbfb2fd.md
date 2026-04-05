---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-learned-qa.mjs"
source_name: "brain-learned-qa.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 595
content_hash: "54bc025c6f70fa52e3d7d854a57e75e57ba6a26ce228e4cf07c811a6c299a012"
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
  - "./brain-text-tokens.mjs"
  - "node:buffer"
  - "node:fs"
  - "node:path"
  - "node:process"
exports:
  - "appendLearnedQa"
  - "findLearnedAnswer"
  - "formatLearnedReply"
  - "isLearnedQaWriteEnabled"
  - "isReusableLearnedQaAnswer"
---

# taskmanager/portable_lib/brain-learned-qa.mjs

> Code module; imports ./brain-runtime-hub.mjs, ./brain-text-tokens.mjs, node:buffer, node:fs; exports appendLearnedQa, findLearnedAnswer, formatLearnedReply, isLearnedQaWriteEnabled

## Key Signals

- Source path: taskmanager/portable_lib/brain-learned-qa.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-hub.mjs, ./brain-text-tokens.mjs, node:buffer, node:fs, node:path, node:process
- Exports: appendLearnedQa, findLearnedAnswer, formatLearnedReply, isLearnedQaWriteEnabled, isReusableLearnedQaAnswer

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-learned-qa.mjs

## Excerpt

~~~javascript
/**
 * Append-only learned Q&A (JSONL) for chat turns saved when Local LLM succeeds.
 * Read during non-LLM draft before BM25. Env: HORIZONS_LEARNED_QA=0 disables writes only.
 */
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { ensureBrainRuntimeHub, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

const FILE_NAME = "learned-qa.jsonl";
/** @type {{ mtime: number, records: object[] } | null} */
let cache = null;

const JACCARD_MIN = 0.82;
const MIN_ANSWER_CHARS = 24;
const MAX_ANSWER_CHARS = 12000;
const MAX_DISPLAY_CHARS = 8000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_LINE_BYTES = 512 * 1024;
const POLISHED_REQUEST_PATTERNS = [
  /\bpolished version of your request\b/i,
  /\brephrased version of your request\b/i,
];

function filePath() {
  migrateLegacyBrainRuntimeData();
~~~