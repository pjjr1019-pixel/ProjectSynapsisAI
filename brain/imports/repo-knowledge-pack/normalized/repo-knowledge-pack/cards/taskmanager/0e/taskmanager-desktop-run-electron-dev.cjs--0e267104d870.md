---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/desktop/run-electron-dev.cjs"
source_name: "run-electron-dev.cjs"
top_level: "taskmanager"
surface: "desktop"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".cjs"
score: 70
selected_rank: 766
content_hash: "8d0dcda9773ef6ff9f74b491296d8823d5eb525e2213877ce0a42e99e19df94b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "cjs"
  - "code"
  - "desktop"
  - "high-value"
  - "scripts"
imports:
  - "electron"
  - "node:child_process"
  - "node:path"
  - "node:process"
---

# taskmanager/desktop/run-electron-dev.cjs

> Code module; imports electron, node:child_process, node:path, node:process

## Key Signals

- Source path: taskmanager/desktop/run-electron-dev.cjs
- Surface: desktop
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 70
- Tags: cjs, code, desktop, high-value, scripts
- Imports: electron, node:child_process, node:path, node:process

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: cjs, code, desktop, high-value, scripts, taskmanager
- Source link target: taskmanager/desktop/run-electron-dev.cjs

## Excerpt

~~~javascript
const { spawn } = require("node:child_process");
const path = require("node:path");
const process = require("node:process");

const electronBinary = require("electron");
const taskmanagerRoot = path.resolve(__dirname, "..");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  cwd: taskmanagerRoot,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: false,
});

child.stdout?.pipe(process.stdout);
child.stderr?.pipe(process.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
~~~