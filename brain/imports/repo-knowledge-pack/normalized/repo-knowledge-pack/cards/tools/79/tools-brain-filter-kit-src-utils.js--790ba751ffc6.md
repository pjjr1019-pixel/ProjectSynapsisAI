---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/utils.js"
source_name: "utils.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3415
content_hash: "222255514580643a69355de18d54a35781895a874ed11190b951f60933f5ebfc"
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
  - "loadConfig,\n  ensureDir,\n  sha256,\n  normalizePath,\n  isTextFile,\n  estimateTokens,\n  safeReadUtf8,\n  readJsonl,\n  writeJsonl,\n  classifyPath,\n  isHardBlocked,\n  relPathFromRoot,\n  walk,\n  printUsage"
---

# tools/brain-filter-kit/src/utils.js

> Code module; imports crypto, fs, path; exports loadConfig,
  ensureDir,
  sha256,
  normalizePath,
  isTextFile,
  estimateTokens,
  safeReadUtf8,
  readJsonl,
  writeJsonl,
  classifyPath,
  isHardBlocked,
  relPathFromRoot,
  walk,
  printUsage

## Key Signals

- Source path: tools/brain-filter-kit/src/utils.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: crypto, fs, path
- Exports: loadConfig,
  ensureDir,
  sha256,
  normalizePath,
  isTextFile,
  estimateTokens,
  safeReadUtf8,
  readJsonl,
  writeJsonl,
  classifyPath,
  isHardBlocked,
  relPathFromRoot,
  walk,
  printUsage

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/src/utils.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function loadConfig(configPath) {
  const abs = path.resolve(configPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Config file not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function isTextFile(filePath, config) {
  return config.textExtensions.includes(path.extname(filePath).toLowerCase());
}
~~~