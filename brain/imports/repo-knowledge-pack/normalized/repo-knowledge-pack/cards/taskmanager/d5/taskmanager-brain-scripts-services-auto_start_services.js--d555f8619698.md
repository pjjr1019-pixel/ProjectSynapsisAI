---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/services/auto_start_services.js"
source_name: "auto_start_services.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 506
content_hash: "b4c7859a6db7c4753413bce6916306869e3f411f8029146bf2533228c9f68574"
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

# taskmanager/brain/scripts/services/auto_start_services.js

> Script surface; imports ../core/runtime

## Key Signals

- Source path: taskmanager/brain/scripts/services/auto_start_services.js
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
- Source link target: taskmanager/brain/scripts/services/auto_start_services.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { parseCliArgs, runTool } = require('../core/runtime');
const args = parseCliArgs(process.argv);
const result = runTool('auto_start_services', args);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
~~~