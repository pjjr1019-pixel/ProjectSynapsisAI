---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/scripts/cleanup/temp_candidates_older_than_days.js"
source_name: "temp_candidates_older_than_days.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 261
content_hash: "2b79cae56d0a93c8989d699989b2260637509ca4744ee326b4bfe3e8a42047c9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "../../shared/core"
---

# taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/scripts/cleanup/temp_candidates_older_than_days.js

> Script surface; imports ../../shared/core

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/scripts/cleanup/temp_candidates_older_than_days.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../../shared/core

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/scripts/cleanup/temp_candidates_older_than_days.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { runToolScript } = require('../../shared/core');
runToolScript('temp_candidates_older_than_days');
~~~