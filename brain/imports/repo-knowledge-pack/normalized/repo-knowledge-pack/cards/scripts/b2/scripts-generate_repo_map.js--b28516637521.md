---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "scripts/generate_repo_map.js"
source_name: "generate_repo_map.js"
top_level: "scripts"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 87
selected_rank: 627
content_hash: "6ced85fb8c1f1deef18d6bb978f03487b54c32ad66a4dab128b27e4aa134689c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "child_process"
  - "path"
---

# scripts/generate_repo_map.js

> Script surface; imports child_process, path

## Key Signals

- Source path: scripts/generate_repo_map.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: scripts
- Score: 87
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: child_process, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts
- Source link target: scripts/generate_repo_map.js

## Excerpt

~~~javascript
#!/usr/bin/env node
// COMPATIBILITY STUB — script moved to:
//   taskmanager/brain/scripts/repo-tools/generate_repo_map.js
// This stub forwards to the new location. Safe to remove once callers are updated.
'use strict';
const _path = require('path');
const { spawnSync } = require('child_process');
const newLocation = _path.resolve(__dirname, '..', 'taskmanager', 'brain', 'scripts', 'repo-tools', 'generate_repo_map.js');
const result = spawnSync(process.execPath, [newLocation, ...process.argv.slice(2)], { stdio: 'inherit', cwd: process.cwd() });
process.exit(result.status ?? 0);
~~~