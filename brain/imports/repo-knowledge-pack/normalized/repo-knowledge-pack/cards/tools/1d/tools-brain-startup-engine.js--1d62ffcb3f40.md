---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-startup/engine.js"
source_name: "engine.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3417
content_hash: "30c893dda0cef606e54fff70bd8eb106f58c80709922b5e8056c5410b3dbfab0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
  - "tools"
imports:
  - "./common"
  - "fs"
  - "path"
exports:
  - "runEngine"
---

# tools/brain-startup/engine.js

> Code module; imports ./common, fs, path; exports runEngine

## Key Signals

- Source path: tools/brain-startup/engine.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ./common, fs, path
- Exports: runEngine

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-startup/engine.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const {
  loadConfig,
  repoRootFromToolsDir,
  resolveExistingSourceRoot,
  getOutputPaths,
  logLine,
  readJson,
  writeJson,
  acquireLock,
  releaseLock,
  listFilesRecursive,
  classifySourceType,
  isTextFile,
  estimateTokens,
  safeReadText,
  scoreEntry,
  sha256,
  winnerOf,
  removeEmptyParents,
  normalizeSlashes
} = require("./common");

function parseConfigPath(defaultPath) {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");
  if (configIndex >= 0 && args[configIndex + 1]) return path.resolve(process.cwd(), args[configIndex + 1]);
~~~