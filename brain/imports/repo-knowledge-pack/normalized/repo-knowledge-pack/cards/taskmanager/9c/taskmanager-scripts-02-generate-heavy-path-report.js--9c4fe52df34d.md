---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/scripts/02-generate-heavy-path-report.js"
source_name: "02-generate-heavy-path-report.js"
top_level: "taskmanager"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 80
selected_rank: 693
content_hash: "48b2047629774ca3c9c287383d78d5dff29c4265c0cbd9d8b6714f8d76976a67"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "../lib/common"
---

# taskmanager/scripts/02-generate-heavy-path-report.js

> Script surface; imports ../lib/common

## Key Signals

- Source path: taskmanager/scripts/02-generate-heavy-path-report.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 80
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts, taskmanager
- Source link target: taskmanager/scripts/02-generate-heavy-path-report.js

## Excerpt

~~~javascript
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, collectDirectoryFileCounts,
  writeRepoFile, nowIso, classifyPath
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');
const dirs = entries.filter((entry) => entry.type === 'directory' && entry.rel !== '.');
const dirFileCounts = collectDirectoryFileCounts(entries);

const sizeMap = new Map();
for (const dir of dirs) sizeMap.set(dir.rel, 0);
for (const file of files) {
  const parts = file.rel.split('/');
  let current = '.';
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current === '.' ? parts[i] : `${current}/${parts[i]}`;
    sizeMap.set(current, (sizeMap.get(current) || 0) + file.size);
  }
}

const rows = dirs.map((dir) => ({
  rel: dir.rel,
  files: dirFileCounts.get(dir.rel) || 0,
  bytes: sizeMap.get(dir.rel) || 0,
~~~