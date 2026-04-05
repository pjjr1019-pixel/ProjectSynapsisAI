---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/08-detect-package-scripts.js"
source_name: "08-detect-package-scripts.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 120
selected_rank: 35
content_hash: "7cececa3592051c0984ca93e85e3aab667a69446f68335a9f4a52bad8f2b538a"
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

# taskmanager/brain/scripts/repo-tools/08-detect-package-scripts.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/08-detect-package-scripts.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 120
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../lib/common, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/08-detect-package-scripts.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, listAllEntries, writeRepoFile, nowIso, discoverProjectMetadata } = require('../lib/common');
const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);
const lines = ['# Package Scripts Report', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, ''];
if (!metadata.packages.length) lines.push('_No package.json files found._');
for (const pkg of metadata.packages) {
  lines.push(`## ${pkg.rel}`, '', `- name: ${pkg.name || '(none)'}`, `- workspaces: ${pkg.workspaces.length ? pkg.workspaces.join(', ') : '(none)'}`, '');
  if (!pkg.scripts.length) lines.push('_No scripts._');
  for (const script of pkg.scripts) lines.push(`- ${script}`);
  lines.push('');
}
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/package-scripts.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
~~~