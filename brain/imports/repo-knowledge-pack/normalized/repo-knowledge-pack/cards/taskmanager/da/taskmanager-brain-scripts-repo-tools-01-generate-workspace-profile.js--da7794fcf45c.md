---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/01-generate-workspace-profile.js"
source_name: "01-generate-workspace-profile.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 244
content_hash: "a5e89187ac2e5409946bf5ee79b1be98477d9cec25eb887e42459b77e8191262"
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

# taskmanager/brain/scripts/repo-tools/01-generate-workspace-profile.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/01-generate-workspace-profile.js
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
- Source link target: taskmanager/brain/scripts/repo-tools/01-generate-workspace-profile.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, loadConfig, listAllEntries, writeRepoFile, nowIso, classifyPath, discoverProjectMetadata, collectDirectoryFileCounts } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);
const fileCounts = collectDirectoryFileCounts(entries);

const topLevel = entries.filter((d) => d.type === 'directory' && d.depth === 1).map((dir) => ({
  rel: dir.rel,
  fileCount: fileCounts.get(dir.rel) || 0,
  classification: classifyPath(dir.rel, config)
})).sort((a, b) => b.fileCount - a.fileCount || a.rel.localeCompare(b.rel));

const extCounts = new Map();
for (const file of entries.filter((e) => e.type === 'file')) {
  const ext = file.ext || '[no extension]';
  extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
}
const topExts = [...extCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
const packageScripts = metadata.packages.flatMap((pkg) => pkg.scripts.map((script) => ({ rel: pkg.rel, script })));

const lines = [];
lines.push('# Workspace Profile', '');
lines.push(`Generated: ${nowIso()}`);
~~~