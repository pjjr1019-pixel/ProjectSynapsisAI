---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/00-run-v2-baseline.js"
source_name: "00-run-v2-baseline.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 241
content_hash: "f0a029d37305f3885daf4fbf6340360db230d1c56c183e25971f174d6b891073"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "../lib/common"
  - "child_process"
  - "path"
---

# taskmanager/brain/scripts/repo-tools/00-run-v2-baseline.js

> Script surface; imports ../lib/common, child_process, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/00-run-v2-baseline.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 110
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../lib/common, child_process, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/00-run-v2-baseline.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, detectRepoRoot } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const scriptDir = __dirname;
const scripts = [
  '01-generate-workspace-profile.js',
  '02-generate-architecture-digest.js',
  '03-detect-entrypoints.js',
  '04-generate-smart-read-order.js',
  '08-detect-package-scripts.js',
  '09-detect-generated-surfaces.js'
];

for (const script of scripts) {
  const full = path.join(scriptDir, script);
  console.log(`Running ${script}...`);
  const result = spawnSync(process.execPath, [full, '--repo', repoRoot], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('V2 baseline reports complete.');
console.log('Output folder: .ai_repo_v2/');
~~~