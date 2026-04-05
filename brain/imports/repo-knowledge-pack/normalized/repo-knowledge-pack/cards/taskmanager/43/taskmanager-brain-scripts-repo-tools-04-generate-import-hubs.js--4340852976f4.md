---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/04-generate-import-hubs.js"
source_name: "04-generate-import-hubs.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 247
content_hash: "59d6845bd34f102e8fbde6bcc4fafa05b4610f49a90a357b155bd4b673402746"
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
  - "fs"
  - "path"
---

# taskmanager/brain/scripts/repo-tools/04-generate-import-hubs.js

> Script surface; imports ../lib/common, fs, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/04-generate-import-hubs.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 110
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../lib/common, fs, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/04-generate-import-hubs.js

## Excerpt

~~~javascript
const fs = require('fs');
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, isLikelyCode, safeReadText,
  extractImports, resolveRelativeImport, writeRepoFile, nowIso, classifyPath
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file' && isLikelyCode(entry.rel));

const codeFiles = files.filter((file) => {
  const className = classifyPath(file.rel, config);
  return className === 'high-value' || className === 'docs' || /taskmanager\/(src|server|shared|desktop|portable_lib)\//.test(file.rel);
});

const fileSet = new Set(codeFiles.map((file) => file.rel));
const inbound = new Map();
const outbound = new Map();

for (const file of codeFiles) {
  inbound.set(file.rel, 0);
  outbound.set(file.rel, 0);
}

for (const file of codeFiles) {
~~~