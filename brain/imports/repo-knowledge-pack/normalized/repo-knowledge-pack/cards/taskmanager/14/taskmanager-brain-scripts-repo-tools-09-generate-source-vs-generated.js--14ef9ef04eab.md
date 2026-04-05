---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/09-generate-source-vs-generated.js"
source_name: "09-generate-source-vs-generated.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 116
selected_rank: 77
content_hash: "2383c602274b4de0c915281a9fef34008f701b646d59bd3f76f6e39d26dc28c9"
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
---

# taskmanager/brain/scripts/repo-tools/09-generate-source-vs-generated.js

> Script surface; imports ../lib/common

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/09-generate-source-vs-generated.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 116
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../lib/common

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/09-generate-source-vs-generated.js

## Excerpt

~~~javascript
const {
  parseArgs, detectRepoRoot, loadConfig, listAllEntries, classifyPath, writeRepoFile, nowIso
} = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const files = entries.filter((entry) => entry.type === 'file');

const buckets = new Map();
for (const key of ['high-value', 'docs', 'neutral', 'low-value', 'generated']) {
  buckets.set(key, []);
}

for (const file of files) {
  const key = classifyPath(file.rel, config);
  if (buckets.has(key)) buckets.get(key).push(file.rel);
}

const lines = [];
lines.push('# Source vs Generated');
lines.push('');
lines.push(`Generated: ${nowIso()}`);
lines.push(`Repo root: \`${repoRoot}\``);
lines.push('');
for (const [bucket, items] of buckets.entries()) {
  lines.push(`## ${bucket}`);
~~~