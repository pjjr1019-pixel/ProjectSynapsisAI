---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-embeddings-local.mjs"
source_name: "brain-embeddings-local.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 588
content_hash: "f9c23ad9514111733c860d6daaee0036997c32cae342cef2451f0c8d6955e9b8"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-runtime-layer.mjs"
  - "node:path"
  - "node:process"
exports:
  - "async"
  - "densePilotRequested"
  - "getDensePilotSettings"
---

# taskmanager/portable_lib/brain-embeddings-local.mjs

> Code module; imports ./brain-runtime-layer.mjs, node:path, node:process; exports async, densePilotRequested, getDensePilotSettings

## Key Signals

- Source path: taskmanager/portable_lib/brain-embeddings-local.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-layer.mjs, node:path, node:process
- Exports: async, densePilotRequested, getDensePilotSettings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-embeddings-local.mjs

## Excerpt

~~~javascript
import path from "node:path";
import process from "node:process";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";

const DEFAULT_EMBED_MODEL = "Xenova/bge-small-en-v1.5";
const DEFAULT_RERANK_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_TABLE = "brain_chunks";

let transformersPromise = null;
const pipelineCache = new Map();

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

export function getDensePilotSettings(opts = {}) {
  const indexesRoot = getBrainRuntimePaths().indexesRoot;
  const dbPath =
    opts.dbPath ||
    process.env.HORIZONS_BRAIN_LANCEDB_PATH?.trim() ||
    path.join(indexesRoot, "lancedb");
  return {
    enabled:
      typeof opts.densePilot === "boolean"
~~~