---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/cleanup/before_after_optimization_snapshot.js"
source_name: "before_after_optimization_snapshot.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 472
content_hash: "5a36aa79edd3b4c9e4aab0cb6f47a0a5b3dcb217c26cc0516b9c78a0cdb37fbd"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "../core/runtime"
---

# taskmanager/brain/scripts/cleanup/before_after_optimization_snapshot.js

> Script surface; imports ../core/runtime

## Key Signals

- Source path: taskmanager/brain/scripts/cleanup/before_after_optimization_snapshot.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../core/runtime

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/cleanup/before_after_optimization_snapshot.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('before_after_optimization_snapshot', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
~~~