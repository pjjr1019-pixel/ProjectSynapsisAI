---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/scripts/07-generate-changed-brief.js"
source_name: "07-generate-changed-brief.js"
top_level: "taskmanager"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 74
selected_rank: 759
content_hash: "f31f7db656fe9afcf78b178093b6ef85b9246b0c937f8f1eaef49ef3718c34bd"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "../lib/common"
  - "child_process"
  - "path"
---

# taskmanager/scripts/07-generate-changed-brief.js

> Script surface; imports ../lib/common, child_process, path

## Key Signals

- Source path: taskmanager/scripts/07-generate-changed-brief.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 74
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common, child_process, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts, taskmanager
- Source link target: taskmanager/scripts/07-generate-changed-brief.js

## Excerpt

~~~javascript
const path = require('path');
const { spawnSync } = require('child_process');
const {
  parseArgs, detectRepoRoot, loadConfig, classifyPath, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();

const gitStatus = spawnSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' });
let changed = [];

if (gitStatus.status === 0) {
  changed = gitStatus.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const rel = line.slice(3).trim().replace(/\\/g, '/');
      return {
        rel,
        status: line.slice(0, 2).trim(),
        className: classifyPath(rel, config)
      };
    });
}
~~~