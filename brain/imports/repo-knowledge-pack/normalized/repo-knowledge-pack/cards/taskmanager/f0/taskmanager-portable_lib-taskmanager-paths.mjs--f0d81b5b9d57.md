---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/taskmanager-paths.mjs"
source_name: "taskmanager-paths.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 673
content_hash: "0b7f1100d467b53876e75d460c4e00eaf53847a0c18a88b3f2a0c9524bba4f5b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "node:fs"
  - "node:path"
  - "node:url"
exports:
  - "getOptimizationReportPaths"
  - "resolveExistingPath"
---

# taskmanager/portable_lib/taskmanager-paths.mjs

> Code module; imports node:fs, node:path, node:url; exports getOptimizationReportPaths, resolveExistingPath

## Key Signals

- Source path: taskmanager/portable_lib/taskmanager-paths.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: node:fs, node:path, node:url
- Exports: getOptimizationReportPaths, resolveExistingPath

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/taskmanager-paths.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readEnvPath(name, fallback) {
  const value = String(process.env[name] || "").trim();
  return value ? path.resolve(value) : fallback;
}

const TASKMANAGER_ROOT = readEnvPath("HORIZONS_TASKMANAGER_ROOT", path.resolve(__dirname, ".."));
const OUTER_WORKSPACE_ROOT = path.resolve(TASKMANAGER_ROOT, "..");
const BRAIN_ROOT = readEnvPath("HORIZONS_BRAIN_ROOT", path.join(TASKMANAGER_ROOT, "brain"));
const GENERATED_ROOT = readEnvPath("HORIZONS_BRAIN_GENERATED_ROOT", path.join(BRAIN_ROOT, "generated"));
const REPORTS_ROOT = readEnvPath("HORIZONS_BRAIN_REPORTS_ROOT", path.join(BRAIN_ROOT, "reports"));
const LEGACY_ROOT_ARCHIVE_ROOT = readEnvPath(
  "HORIZONS_LEGACY_ROOT_ARCHIVE",
  path.join(REPORTS_ROOT, "legacy-root")
);
const APP_RUNTIME_STATE_ROOT = readEnvPath(
  "HORIZONS_RUNTIME_STATE_ROOT",
  path.join(TASKMANAGER_ROOT, ".runtime")
);

const CANONICAL_RUNTIME_ROOT = path.join(BRAIN_ROOT, "runtime");
const CANONICAL_RUNTIME_SETTINGS_ROOT = path.join(CANONICAL_RUNTIME_ROOT, "settings");
const GENERATED_RUNTIME_ROOT = readEnvPath(
~~~