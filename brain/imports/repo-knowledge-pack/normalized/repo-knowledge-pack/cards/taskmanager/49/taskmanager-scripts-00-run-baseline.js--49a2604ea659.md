---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/scripts/00-run-baseline.js"
source_name: "00-run-baseline.js"
top_level: "taskmanager"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 74
selected_rank: 754
content_hash: "db30c2675ba2f042f437b52b52a0f59f247c22e9e99e008f66166d7b31fae8a6"
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
  - "url"
---

# taskmanager/scripts/00-run-baseline.js

> Script surface; imports child_process, path, url

## Key Signals

- Source path: taskmanager/scripts/00-run-baseline.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 74
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: child_process, path, url

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts, taskmanager
- Source link target: taskmanager/scripts/00-run-baseline.js

## Excerpt

~~~javascript
// COMPATIBILITY STUB
// Scripts have moved to: taskmanager/brain/scripts/repo-tools/
// This stub forwards to the new location so existing callers continue to work.
// Once all callers reference the new path, this file can be removed.
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const newLocation = path.resolve(__dirname, '..', 'brain', 'scripts', 'repo-tools', '00-run-baseline.js');
const result = spawnSync(process.execPath, [newLocation, ...process.argv.slice(2)], { stdio: 'inherit', cwd: process.cwd() });
process.exit(result.status ?? 0);
~~~