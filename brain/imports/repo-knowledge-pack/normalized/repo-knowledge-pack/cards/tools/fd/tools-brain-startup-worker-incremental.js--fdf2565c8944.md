---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-startup/worker-incremental.js"
source_name: "worker-incremental.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3420
content_hash: "18772020ff09411876af7a50936f99a669c1a3c269c75c14268ebc52dde5b391"
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

# tools/brain-startup/worker-incremental.js

> Code module; imports ./engine

## Key Signals

- Source path: tools/brain-startup/worker-incremental.js
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
- Source link target: tools/brain-startup/worker-incremental.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { runEngine } = require("./engine");

Promise.resolve()
  .then(() => runEngine({ forceFull: false }))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
~~~