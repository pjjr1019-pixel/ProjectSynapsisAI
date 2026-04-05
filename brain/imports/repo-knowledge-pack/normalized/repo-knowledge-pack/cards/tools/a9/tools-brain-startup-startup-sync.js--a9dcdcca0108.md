---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-startup/startup-sync.js"
source_name: "startup-sync.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3418
content_hash: "484c88f0628ff67fa9b2442bfdba930ca578bd55afa5475e54c4870911722915"
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
  - "child_process"
  - "fs"
  - "path"
---

# tools/brain-startup/startup-sync.js

> Code module; imports ./common, child_process, fs, path

## Key Signals

- Source path: tools/brain-startup/startup-sync.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ./common, child_process, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-startup/startup-sync.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const {
  repoRootFromToolsDir,
  loadConfig,
  getOutputPaths,
  logLine,
  readJson,
  isPidRunning
} = require("./common");

const repoRoot = repoRootFromToolsDir(__dirname);
const configPath = path.join(__dirname, "config.json");
const config = loadConfig(configPath);
const outputPaths = getOutputPaths(repoRoot, config);
const bootLockFile = path.join(outputPaths.stateDir, "boot.lock");

const existingBoot = readJson(bootLockFile, null);
if (existingBoot && existingBoot.pid && isPidRunning(existingBoot.pid)) {
  logLine(outputPaths.logFile, `startup_skip existing_boot_pid=${existingBoot.pid}`);
  process.exit(0);
}

fs.writeFileSync(
  bootLockFile,
  JSON.stringify({ pid: process.pid, startedAtIso: new Date().toISOString() }, null, 2),
~~~