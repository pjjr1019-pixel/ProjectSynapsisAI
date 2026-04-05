---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-runtime-hub.mjs"
source_name: "brain-runtime-hub.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3435
content_hash: "aec4ab7255dcf8635f9be473378ced43a86b312f788da84b82086ae09a5841b4"
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
  - "./taskmanager-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "ensureBrainRuntimeHub"
  - "getBrainRuntimeHubPaths"
  - "migrateLegacyBrainRuntimeData"
  - "resetBrainRuntimeMigrationCache"
---

# taskmanager/portable_lib/brain-runtime-hub.mjs

> Code module; imports ./brain-build-utils.mjs, ./taskmanager-paths.mjs, node:fs, node:path; exports ensureBrainRuntimeHub, getBrainRuntimeHubPaths, migrateLegacyBrainRuntimeData, resetBrainRuntimeMigrationCache

## Key Signals

- Source path: taskmanager/portable_lib/brain-runtime-hub.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./taskmanager-paths.mjs, node:fs, node:path
- Exports: ensureBrainRuntimeHub, getBrainRuntimeHubPaths, migrateLegacyBrainRuntimeData, resetBrainRuntimeMigrationCache

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-runtime-hub.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { ensureDir, normalizeSlashes } from "./brain-build-utils.mjs";
import { ensureTaskmanagerPathDirs, getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();

let migrationCache = null;

function ensureParent(filePath) {
  ensureDir(path.dirname(filePath));
}

function walkFiles(fullDir) {
  if (!fs.existsSync(fullDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const full = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }
    out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function copyFileIfNewer(src, dst) {
~~~