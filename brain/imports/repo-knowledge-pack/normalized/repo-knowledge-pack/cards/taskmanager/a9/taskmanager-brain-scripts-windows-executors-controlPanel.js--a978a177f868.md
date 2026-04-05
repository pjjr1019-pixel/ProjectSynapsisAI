---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/executors/controlPanel.js"
source_name: "controlPanel.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 523
content_hash: "98aac1602517333810cc0c3ba5049fe65cc3caf574f297fab88352a1c15d41d0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "node:child_process"
exports:
  - "runControlPanel"
---

# taskmanager/brain/scripts/windows/executors/controlPanel.js

> Script surface; imports node:child_process; exports runControlPanel

## Key Signals

- Source path: taskmanager/brain/scripts/windows/executors/controlPanel.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: node:child_process
- Exports: runControlPanel

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/executors/controlPanel.js

## Excerpt

~~~javascript
const { spawn } = require("node:child_process");

function runControlPanel(canonicalName) {
  return new Promise((resolve, reject) => {
    const child = spawn("control.exe", ["/name", canonicalName], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: canonicalName, executor: "controlPanel" });
  });
}

module.exports = { runControlPanel };
~~~