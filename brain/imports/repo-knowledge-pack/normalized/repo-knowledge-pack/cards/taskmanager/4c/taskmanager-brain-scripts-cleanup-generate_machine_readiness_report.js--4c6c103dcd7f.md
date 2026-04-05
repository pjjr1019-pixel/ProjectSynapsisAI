---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/cleanup/generate_machine_readiness_report.js"
source_name: "generate_machine_readiness_report.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 114
selected_rank: 102
content_hash: "2c007330cd55e0f5145e56341890f97d7deedbcf19c068dec93e254727dc2c1e"
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

# taskmanager/brain/scripts/cleanup/generate_machine_readiness_report.js

> Script surface; imports ../core/runtime

## Key Signals

- Source path: taskmanager/brain/scripts/cleanup/generate_machine_readiness_report.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 114
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../core/runtime

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/cleanup/generate_machine_readiness_report.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('generate_machine_readiness_report', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
~~~