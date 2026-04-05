---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/command.js"
source_name: "command.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3934
content_hash: "f00eab8838f16739bdc0b650a7f3b5335e865d66486c806ba2e7ff753b4e561f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "node:child_process"
exports:
  - "runCommand"
---

# taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/command.js

> Code module; imports node:child_process; exports runCommand

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/command.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Imports: node:child_process
- Exports: runCommand

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/command.js

## Excerpt

~~~javascript
const { spawn } = require("node:child_process");

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: command, args, executor: "command" });
  });
}

module.exports = { runCommand };
~~~