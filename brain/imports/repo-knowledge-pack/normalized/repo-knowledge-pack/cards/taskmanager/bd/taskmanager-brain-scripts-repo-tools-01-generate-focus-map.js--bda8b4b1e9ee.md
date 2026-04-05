---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/01-generate-focus-map.js"
source_name: "01-generate-focus-map.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 243
content_hash: "d44d655394e6b2c0683cb14a23c85a125751be530df515267e610d7dcc80e496"
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
  - "path"
---

# taskmanager/brain/scripts/repo-tools/01-generate-focus-map.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/01-generate-focus-map.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 110
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../lib/common, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/01-generate-focus-map.js

## Excerpt

~~~javascript
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, outputDir, ensureDir,
  writeRepoFile, classifyPath, collectDirectoryFileCounts, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries, unreadable } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');
const dirs = entries.filter((entry) => entry.type === 'directory');
const dirFileCounts = collectDirectoryFileCounts(entries);

const highValueFiles = files.filter((file) => classifyPath(file.rel, config) === 'high-value');
const docsFiles = files.filter((file) => classifyPath(file.rel, config) === 'docs');
const generatedFiles = files.filter((file) => classifyPath(file.rel, config) === 'generated');
const lowValueFiles = files.filter((file) => classifyPath(file.rel, config) === 'low-value');
const neutralFiles = files.filter((file) => classifyPath(file.rel, config) === 'neutral');

const directorySummary = dirs
  .filter((dir) => dir.rel !== '.')
  .map((dir) => ({
    rel: dir.rel,
    files: dirFileCounts.get(dir.rel) || 0,
    className: classifyPath(dir.rel, config)
  }))
  .filter((dir) => dir.files > 0)
~~~