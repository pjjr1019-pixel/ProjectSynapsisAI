---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/scripts/06-generate-context-pack.js"
source_name: "06-generate-context-pack.js"
top_level: "taskmanager"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 74
selected_rank: 758
content_hash: "e08e5dfccc139ac8eef37fd668b1d9e5275c1c9eb2032ed1a508709208e4c13a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "../lib/common"
  - "fs"
  - "path"
---

# taskmanager/scripts/06-generate-context-pack.js

> Script surface; imports ../lib/common, fs, path

## Key Signals

- Source path: taskmanager/scripts/06-generate-context-pack.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 74
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts, taskmanager
- Source link target: taskmanager/scripts/06-generate-context-pack.js

## Excerpt

~~~javascript
const fs = require('fs');
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, scorePathForTask,
  classifyPath, safeReadText, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const task = args.task || args._.join(' ').trim();

if (!task) {
  console.error('Usage: node 06-generate-context-pack.js --task "describe the work" [--repo path]');
  process.exit(1);
}

const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const scored = files.map((file) => ({
  rel: file.rel,
  score: scorePathForTask(file.rel, task, config),
  className: classifyPath(file.rel, config),
  size: file.size
})).filter((row) => row.score > 0)
  .sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel))
  .slice(0, config.contextPack.maxFiles);
~~~