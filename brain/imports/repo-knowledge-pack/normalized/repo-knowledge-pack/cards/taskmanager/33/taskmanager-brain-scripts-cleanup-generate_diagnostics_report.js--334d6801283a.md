---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/cleanup/generate_diagnostics_report.js"
source_name: "generate_diagnostics_report.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 114
selected_rank: 101
content_hash: "a601500d608addd1aff1d17b408800756121d5595e494bcaa1a488be135eb5c1"
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

# taskmanager/brain/scripts/cleanup/generate_diagnostics_report.js

> Script surface; imports ../core/runtime

## Key Signals

- Source path: taskmanager/brain/scripts/cleanup/generate_diagnostics_report.js
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
- Source link target: taskmanager/brain/scripts/cleanup/generate_diagnostics_report.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('generate_diagnostics_report', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
~~~