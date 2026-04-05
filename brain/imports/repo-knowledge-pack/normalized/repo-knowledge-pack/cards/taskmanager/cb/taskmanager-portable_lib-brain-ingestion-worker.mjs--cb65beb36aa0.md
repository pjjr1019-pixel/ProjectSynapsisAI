---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-ingestion-worker.mjs"
source_name: "brain-ingestion-worker.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 593
content_hash: "41b2efc484a6b6b31e1683e57e2c942eca6a49e7a45b059781dcd250ef3e2b9a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-drift-detector.mjs"
  - "./brain-runtime-hub.mjs"
  - "node:child_process"
  - "node:fs"
  - "node:path"
  - "node:process"
exports:
  - "async"
  - "getIngestionSnapshot"
  - "startIngestionWorker"
---

# taskmanager/portable_lib/brain-ingestion-worker.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-drift-detector.mjs, ./brain-runtime-hub.mjs, node:child_process; exports async, getIngestionSnapshot, startIngestionWorker

## Key Signals

- Source path: taskmanager/portable_lib/brain-ingestion-worker.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-drift-detector.mjs, ./brain-runtime-hub.mjs, node:child_process, node:fs, node:path
- Exports: async, getIngestionSnapshot, startIngestionWorker

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-ingestion-worker.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { detectBrainDrift } from "./brain-drift-detector.mjs";
import { ensureBrainRuntimeHub, getBrainRuntimeHubPaths } from "./brain-runtime-hub.mjs";
import { writeJsonStable } from "./brain-build-utils.mjs";

const DEFAULT_INTERVAL_MINUTES = 60;
const MIN_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 24 * 60;
const SCRIPT_PATHS = [
  "scripts/ingest-live-financial.mjs",
  "scripts/ingest-live-intel.mjs",
];

const runtimeState = {
  started: false,
  timer: null,
  active: false,
  logger: console,
};

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
~~~