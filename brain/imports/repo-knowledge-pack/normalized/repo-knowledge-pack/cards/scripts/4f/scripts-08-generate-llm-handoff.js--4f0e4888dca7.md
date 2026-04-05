---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "scripts/08-generate-llm-handoff.js"
source_name: "08-generate-llm-handoff.js"
top_level: "scripts"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 81
selected_rank: 682
content_hash: "d91c9ddf9e56907739d962e1e8df572c7efa2eefaa197ea917f6104948887368"
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

# scripts/08-generate-llm-handoff.js

> Script surface; imports ../lib/common, fs, path

## Key Signals

- Source path: scripts/08-generate-llm-handoff.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: scripts
- Score: 81
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts
- Source link target: scripts/08-generate-llm-handoff.js

## Excerpt

~~~javascript
const fs = require('fs');
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, scorePathForTask,
  classifyPath, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const task = args.task || args._.join(' ').trim();

if (!task) {
  console.error('Usage: node 08-generate-llm-handoff.js --task "describe the work" [--repo path]');
  process.exit(1);
}

const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const scored = files.map((file) => ({
  rel: file.rel,
  score: scorePathForTask(file.rel, task, config),
  className: classifyPath(file.rel, config)
})).sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel));

const readFirst = scored.filter((row) => row.score > 0).slice(0, 12);
const avoid = scored.filter((row) => row.className === 'generated' || row.className === 'low-value').slice(0, 15);
~~~