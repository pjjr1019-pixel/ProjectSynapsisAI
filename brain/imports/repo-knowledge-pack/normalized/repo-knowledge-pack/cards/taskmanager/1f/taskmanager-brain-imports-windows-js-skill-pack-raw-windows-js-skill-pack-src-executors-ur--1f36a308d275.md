---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/uri.js"
source_name: "uri.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3938
content_hash: "77a168b656febd11646ccb6cec0b035ce3369bae38b794eead05682084d6bb32"
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
  - "runUri"
---

# taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/uri.js

> Code module; imports node:child_process; exports runUri

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/uri.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Imports: node:child_process
- Exports: runUri

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/executors/uri.js

## Excerpt

~~~javascript
const { spawn } = require("node:child_process");

function runUri(target) {
  return new Promise((resolve, reject) => {
    const child = spawn("cmd", ["/c", "start", "", target], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: target, executor: "uri" });
  });
}

module.exports = { runUri };
~~~