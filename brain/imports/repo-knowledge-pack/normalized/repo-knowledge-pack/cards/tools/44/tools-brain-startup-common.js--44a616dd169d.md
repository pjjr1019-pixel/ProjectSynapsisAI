---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-startup/common.js"
source_name: "common.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3416
content_hash: "c171609d1dc2953ad13b3e9348646286632227758ba299824f4571f514762ced"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
  - "tools"
imports:
  - "crypto"
  - "fs"
  - "path"
exports:
  - "repoRootFromToolsDir,\n  loadConfig,\n  ensureDir,\n  sha256,\n  normalizeSlashes,\n  resolveExistingSourceRoot,\n  getOutputPaths,\n  logLine,\n  isPidRunning,\n  readJson,\n  writeJson,\n  acquireLock,\n  releaseLock,\n  listFilesRecursive,\n  classifySourceType,\n  isTextFile,\n  estimateTokens,\n  safeReadText,\n  scoreEntry,\n  winnerOf,\n  removeEmptyParents"
---

# tools/brain-startup/common.js

> Code module; imports crypto, fs, path; exports repoRootFromToolsDir,
  loadConfig,
  ensureDir,
  sha256,
  normalizeSlashes,
  resolveExistingSourceRoot,
  getOutputPaths,
  logLine,
  isPidRunning,
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
  winnerOf,
  removeEmptyParents

## Key Signals

- Source path: tools/brain-startup/common.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: crypto, fs, path
- Exports: repoRootFromToolsDir,
  loadConfig,
  ensureDir,
  sha256,
  normalizeSlashes,
  resolveExistingSourceRoot,
  getOutputPaths,
  logLine,
  isPidRunning,
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
  winnerOf,
  removeEmptyParents

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-startup/common.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function repoRootFromToolsDir(__dirnameValue) {
  return path.resolve(__dirnameValue, "..", "..");
}

function loadConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, "/");
}

function resolveExistingSourceRoot(repoRoot, config) {
  for (const rel of config.sourceCandidates || []) {
    const full = path.resolve(repoRoot, rel);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
~~~