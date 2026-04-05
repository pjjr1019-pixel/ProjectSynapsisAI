---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/indexing/generate_pack.js"
source_name: "generate_pack.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 122
selected_rank: 26
content_hash: "3249137fb895440e4a96c143582106256fe5466eb4a0a91c8d78bd109344d33a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "index"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./tool_catalog"
  - "${runtimeRequire}"
  - "fs"
  - "path"
exports:
  - "main"
---

# taskmanager/brain/scripts/indexing/generate_pack.js

> Script surface; imports ./tool_catalog, ${runtimeRequire}, fs, path; exports main

## Key Signals

- Source path: taskmanager/brain/scripts/indexing/generate_pack.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-scripts, code, index, js, neutral, scripts
- Imports: ./tool_catalog, ${runtimeRequire}, fs, path
- Exports: main

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, index, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/indexing/generate_pack.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const {
  TOOL_DEFINITIONS,
  TOOL_ALIASES,
  PLAYBOOKS,
  getCategoryCounts,
} = require("./tool_catalog");

const SCRIPTS_ROOT = path.resolve(__dirname, "..");
const REGISTRY_DIR = path.join(SCRIPTS_ROOT, "registry");
const DOCS_DIR = path.join(SCRIPTS_ROOT, "docs");
const STAGING_REVIEW_DIR = path.join(SCRIPTS_ROOT, "staging_review");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, `${value}\n`, "utf8");
}

function toWindowsPath(value) {
  return String(value).split(path.sep).join("/");
~~~