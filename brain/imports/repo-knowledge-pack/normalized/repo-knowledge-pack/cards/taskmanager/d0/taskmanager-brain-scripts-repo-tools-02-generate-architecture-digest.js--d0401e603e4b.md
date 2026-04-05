---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/02-generate-architecture-digest.js"
source_name: "02-generate-architecture-digest.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 245
content_hash: "64a16af995f2a8e5ed444971013f4bd31b702c7941e42a22092d24243bdba2e7"
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

# taskmanager/brain/scripts/repo-tools/02-generate-architecture-digest.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/02-generate-architecture-digest.js
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
- Source link target: taskmanager/brain/scripts/repo-tools/02-generate-architecture-digest.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const { parseArgs, detectRepoRoot, listAllEntries, writeRepoFile, nowIso, safeReadText, discoverProjectMetadata } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);

const candidates = [...metadata.found.readmes, ...metadata.found.architectureDocs, ...metadata.found.envExamples]
  .filter((file, index, arr) => arr.findIndex((x) => x.rel === file.rel) === index)
  .slice(0, 40)
  .map((file) => ({ rel: file.rel, preview: safeReadText(path.join(repoRoot, file.rel), 18000).split(/\r?\n/).filter(Boolean).slice(0, 25).join('\n') }));

const lines = ['# Architecture Digest', '', `Generated: ${nowIso()}`, `Repo root: ${repoRoot}`, '', 'This report is a compact first-pass digest of README, READ_FIRST, architecture, plan, contract, rules, and env-example files.', ''];
for (const doc of candidates) {
  lines.push(`## ${doc.rel}`, '', '```text', doc.preview || '[empty or unreadable]', '```', '');
}
const outputPath = writeRepoFile(repoRoot, '.ai_repo_v2/architecture-digest.md', lines.join('\n'));
console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
~~~