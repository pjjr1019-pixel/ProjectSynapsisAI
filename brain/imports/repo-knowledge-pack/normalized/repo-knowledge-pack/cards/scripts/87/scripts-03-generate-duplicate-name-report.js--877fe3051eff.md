---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "scripts/03-generate-duplicate-name-report.js"
source_name: "03-generate-duplicate-name-report.js"
top_level: "scripts"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 87
selected_rank: 625
content_hash: "8ce2ea23acb4c84bdc8fae46cffa64d09ffdf42298035a6d3fa00bb0cbc4927d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "../lib/common"
  - "path"
---

# scripts/03-generate-duplicate-name-report.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: scripts/03-generate-duplicate-name-report.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: scripts
- Score: 87
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts
- Source link target: scripts/03-generate-duplicate-name-report.js

## Excerpt

~~~javascript
const path = require('path');
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, groupBy, writeRepoFile, nowIso
} = require('../lib/common');

function stem(name) {
  return name
    .toLowerCase()
    .replace(/\.(d\.)?(tsx?|jsx?|mjs|cjs|mts|cts|json|jsonl|md|txt|css|html?)$/i, '')
    .replace(/[-_.]/g, '');
}

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const byName = groupBy(files, (file) => file.name.toLowerCase());
const byStem = groupBy(files, (file) => stem(file.name));

const exactDupes = [...byName.entries()]
  .filter(([, group]) => group.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const stemDupes = [...byStem.entries()]
  .filter(([, group]) => group.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
~~~