---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-startup/worker-full.js"
source_name: "worker-full.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3419
content_hash: "1745f5b2f48e7b5ec33fb73a2827aca2d32da3fb4a88d47d5222c89a27e854c2"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
  - "tools"
imports:
  - "./engine"
---

# tools/brain-startup/worker-full.js

> Code module; imports ./engine

## Key Signals

- Source path: tools/brain-startup/worker-full.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ./engine

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-startup/worker-full.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { runEngine } = require("./engine");

Promise.resolve()
  .then(() => runEngine({ forceFull: true }))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
~~~