---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-registry.mjs"
source_name: "process-knowledge-registry.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 621
content_hash: "b9923e18aeb6f76ad2bcb064fe8f0b3d4302692ef38ee2185c3d1e574a43a5bd"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-compliance.mjs"
  - "./process-knowledge-identity.mjs"
  - "./process-knowledge-paths.mjs"
  - "node:fs"
  - "node:path"
---

# taskmanager/portable_lib/process-knowledge-registry.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-compliance.mjs, ./process-knowledge-identity.mjs, ./process-knowledge-paths.mjs

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-registry.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-compliance.mjs, ./process-knowledge-identity.mjs, ./process-knowledge-paths.mjs, node:fs, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-registry.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { ensureDir, stableStringify } from "./brain-build-utils.mjs";
import { scanForPii } from "./brain-compliance.mjs";
import { getProcessKnowledgePaths } from "./process-knowledge-paths.mjs";
import { sanitizePath } from "./process-knowledge-identity.mjs";

const REGISTRY_STATUSES = new Set([
  "pending",
  "enriching",
  "resolved_high_confidence",
  "resolved_medium_confidence",
  "low_confidence",
  "unresolved",
  "conflicted",
  "failed",
  "ignored",
]);

const nextRetryScheduleMs = [5 * 60 * 1000, 30 * 60 * 1000, 4 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000];

let registryWriteLock = false;
let seenRegistryCache = { mtime: 0, data: null };
let pendingQueueCache = { mtime: 0, data: null };

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
~~~