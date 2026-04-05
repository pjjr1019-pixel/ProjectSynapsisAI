---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/.ai_repo/context-pack-generate-a-focus-map.md"
source_name: "context-pack-generate-a-focus-map.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4362
content_hash: "14b9808d4481ec4d7fb1ab93ade4d3c862af5de702aeccae6a6de7c23b2f9749"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
imports:
  - "../lib/common"
  - "fs"
  - "path"
headings:
  - "Context Pack"
  - "scripts/01-generate-focus-map.js"
  - "scripts/02-generate-heavy-path-report.js"
  - "scripts/03-generate-duplicate-name-report.js"
  - "scripts/04-generate-import-hubs.js"
---

# taskmanager/.ai_repo/context-pack-generate-a-focus-map.md

> Markdown doc; imports ../lib/common, fs, path; headings Context Pack / scripts/01-generate-focus-map.js / scripts/02-generate-heavy-path-report.js

## Key Signals

- Source path: taskmanager/.ai_repo/context-pack-generate-a-focus-map.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: docs, markdown, md, neutral, source
- Imports: ../lib/common, fs, path
- Headings: Context Pack | scripts/01-generate-focus-map.js | scripts/02-generate-heavy-path-report.js | scripts/03-generate-duplicate-name-report.js | scripts/04-generate-import-hubs.js

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/.ai_repo/context-pack-generate-a-focus-map.md

## Excerpt

~~~markdown
# Context Pack

Generated: 2026-04-01T05:43:47.511Z
Repo root: `/mnt/data/repo_token_saver_pack`
Task: **generate a focus map**

This file is meant to be pasted into a coding model instead of the whole repo.

## scripts/01-generate-focus-map.js

- score: 38
- class: neutral

```
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
~~~