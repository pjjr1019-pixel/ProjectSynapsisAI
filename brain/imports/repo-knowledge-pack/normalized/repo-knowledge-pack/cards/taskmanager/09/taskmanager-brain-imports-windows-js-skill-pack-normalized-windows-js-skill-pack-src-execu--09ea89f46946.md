---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/executors/shellFolder.js"
source_name: "shellFolder.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3921
content_hash: "c2fdce5d4eb629be4561b3240f16b0e541ad5e65df536ac5b0ae80473ccbb7d4"
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
  - "runShellFolder"
---

# taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/executors/shellFolder.js

> Code module; imports node:child_process; exports runShellFolder

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/executors/shellFolder.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Imports: node:child_process
- Exports: runShellFolder

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/executors/shellFolder.js

## Excerpt

~~~javascript
const { spawn } = require("node:child_process");

function runShellFolder(target) {
  return new Promise((resolve, reject) => {
    const child = spawn("explorer.exe", [target], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: target, executor: "shellFolder" });
  });
}

module.exports = { runShellFolder };
~~~