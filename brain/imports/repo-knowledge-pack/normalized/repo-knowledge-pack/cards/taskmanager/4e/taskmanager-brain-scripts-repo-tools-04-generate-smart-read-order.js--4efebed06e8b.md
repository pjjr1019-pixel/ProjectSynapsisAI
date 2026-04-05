---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/04-generate-smart-read-order.js"
source_name: "04-generate-smart-read-order.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 248
content_hash: "546f5daf2c05bd78cede22fe4604b59d9c5193659a2556cfe836356ed2782e3d"
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

# taskmanager/brain/scripts/repo-tools/04-generate-smart-read-order.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/04-generate-smart-read-order.js
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
- Source link target: taskmanager/brain/scripts/repo-tools/04-generate-smart-read-order.js

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
const lines = ['# Smart Read Order', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '', 'Read in roughly this order before editing the repo:', ''];
rows.forEach((row, i) => lines.push(`${i + 1}. ${row.rel} — score ${row.files} — ${row.bias}`));
lines.push('', '## package.json Overview', '');
const metadata = require('../lib/common').discoverProjectMetadata(repoRoot, entries);
if (!metadata.packages.length) lines.push('_No package.json files found._');
for (const pkg of metadata.packages) lines.push(`- ${pkg.rel} (${pkg.scripts.length} scripts, ${pkg.deps.length} deps, ${pkg.devDeps.length} devDeps)`);
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/smart-read-order.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
~~~