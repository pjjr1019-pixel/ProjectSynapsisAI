---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/desktop/runtime-host.cjs"
source_name: "runtime-host.cjs"
top_level: "taskmanager"
surface: "desktop"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".cjs"
score: -10
selected_rank: 3466
content_hash: "1b99d89d31910f62e386cfa8a36c99ce717aa84e1297a32485b2083df3d421e6"
generated_at: "2026-04-02T15:23:56.818Z"
tags:
  - "cjs"
  - "code"
  - "desktop"
  - "high-value"
  - "scripts"
imports:
  - "node:child_process"
  - "node:fs"
  - "node:http"
  - "node:os"
  - "node:path"
  - "node:process"
  - "node:url"
---

# taskmanager/desktop/runtime-host.cjs

> Code module; imports node:child_process, node:fs, node:http, node:os

## Key Signals

- Source path: taskmanager/desktop/runtime-host.cjs
- Surface: desktop
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: -10
- Tags: cjs, code, desktop, high-value, scripts
- Imports: node:child_process, node:fs, node:http, node:os, node:path, node:process

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: cjs, code, desktop, high-value, scripts, taskmanager
- Source link target: taskmanager/desktop/runtime-host.cjs

## Excerpt

~~~javascript
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const process = require("node:process");
const { spawn } = require("node:child_process");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const OS_SNAPSHOT_POST_TIMEOUT_MS = 8000;
const OS_SNAPSHOT_WARNING_COOLDOWN_MS = 15000;

function createLazyModuleLoader(filePath) {
  let modulePromise = null;
  return async function loadModule() {
    if (!modulePromise) {
      modulePromise = import(pathToFileURL(filePath).href);
    }
    return modulePromise;
  };
}

function derivePathsFromRepoRoot(repoRoot) {
  const taskmanagerRoot = resolve(repoRoot || resolve(__dirname, ".."));
  return {
    taskmanagerRoot,
    shared: {
      taskManagerCoreFile: resolve(taskmanagerRoot, "shared", "task-manager-core.mjs"),
    },
~~~