---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/network/local_network_diagnostics_summary.js"
source_name: "local_network_diagnostics_summary.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 114
selected_rank: 105
content_hash: "c6f25cf4c409aa5639dcb9e8fbfa47ea9e1746caf31c9b37f5698e86078016d4"
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

# taskmanager/brain/scripts/network/local_network_diagnostics_summary.js

> Script surface; imports ../core/runtime

## Key Signals

- Source path: taskmanager/brain/scripts/network/local_network_diagnostics_summary.js
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
- Source link target: taskmanager/brain/scripts/network/local_network_diagnostics_summary.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('local_network_diagnostics_summary', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
~~~