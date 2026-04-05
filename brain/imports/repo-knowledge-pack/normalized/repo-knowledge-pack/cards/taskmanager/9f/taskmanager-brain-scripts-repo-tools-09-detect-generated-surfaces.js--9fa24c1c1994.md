---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/09-detect-generated-surfaces.js"
source_name: "09-detect-generated-surfaces.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 253
content_hash: "a7094b51cba5d6f155157e964aac6e44bcfdb47a367942ac90a788905b3a3dd2"
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

# taskmanager/brain/scripts/repo-tools/09-detect-generated-surfaces.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/09-detect-generated-surfaces.js
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
- Source link target: taskmanager/brain/scripts/repo-tools/09-detect-generated-surfaces.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, loadConfig, listAllEntries, writeRepoFile, nowIso, classifyPath, groupBy, collectDirectoryFileCounts } = require('../lib/common');
const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const dirs = entries.filter((e) => e.type === 'directory');
const counts = collectDirectoryFileCounts(entries);
const rows = dirs.map((dir) => ({ rel: dir.rel, bias: classifyPath(dir.rel, config), files: counts.get(dir.rel) || 0 })).filter((row) => row.rel !== '.').sort((a, b) => b.files - a.files || a.rel.localeCompare(b.rel));
const groups = groupBy(rows, (row) => row.bias);
const lines = ['# Generated vs Canonical Surfaces', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, ''];
for (const key of ['high-value', 'docs', 'neutral', 'low-value', 'generated']) {
  const items = (groups.get(key) || []).slice(0, 50);
  lines.push(`## ${key}`, '');
  if (!items.length) {
    lines.push('_None found._');
  } else {
    lines.push('| Files under path | Directory |', '|---:|---|');
    for (const item of items) lines.push(`| ${item.files} | ${item.rel}/ |`);
  }
  lines.push('');
}
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/generated-vs-canonical.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
~~~