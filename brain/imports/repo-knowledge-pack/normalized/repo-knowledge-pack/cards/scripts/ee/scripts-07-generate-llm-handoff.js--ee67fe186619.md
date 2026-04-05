---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "scripts/07-generate-llm-handoff.js"
source_name: "07-generate-llm-handoff.js"
top_level: "scripts"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 81
selected_rank: 681
content_hash: "201d0032f6e1947db0954f598012276163ed00260936fee22e51fca09b65a41f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "../lib/common"
---

# scripts/07-generate-llm-handoff.js

> Script surface; imports ../lib/common

## Key Signals

- Source path: scripts/07-generate-llm-handoff.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: scripts
- Score: 81
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts
- Source link target: scripts/07-generate-llm-handoff.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { parseArgs, detectRepoRoot, loadConfig, listAllEntries, writeRepoFile, discoverProjectMetadata, classifyPath, scorePathForTask, topN, slugify } = require('../lib/common');

const args = parseArgs(process.argv);
const task = args.task || args._.join(' ') || 'edit the repo with minimal token waste';
const repoRoot = detectRepoRoot(args);
const config = loadConfig();
const { entries } = listAllEntries(repoRoot);
const metadata = discoverProjectMetadata(repoRoot, entries);
const packageScripts = metadata.packages.flatMap((pkg) => pkg.scripts);
const files = entries.filter((e) => e.type === 'file');
const ranked = topN(files.map((file) => ({ ...file, bias: classifyPath(file.rel, config), score: scorePathForTask(file.rel, task, config, { packageScripts }) })).filter((file) => file.score > -5), 18);

const parts = [];
parts.push('You are working inside this repository.', '');
parts.push(`Task: ${task}`, '');
parts.push('Rules:');
parts.push('- Minimize token waste.');
parts.push('- Read high-value files first.');
parts.push('- Avoid generated, runtime, cache, index, dependency, and historical artifact folders unless the task clearly requires them.');
parts.push('- Before editing, inspect the likely canonical docs, entrypoints, manifests, and the files listed below.');
parts.push('- Do not refactor unrelated surfaces.', '', 'Likely first reads:');
ranked.forEach((row, i) => parts.push(`${i + 1}. ${row.rel} [${row.bias}, score=${row.score}]`));
parts.push('', 'Auto-discovered package.json files:');
if (!metadata.packages.length) parts.push('- none');
for (const pkg of metadata.packages) parts.push(`- ${pkg.rel} (${pkg.scripts.length} scripts)`);
parts.push('', 'Preferred behavior:', '1. Read the smallest high-value files first.', '2. Confirm the real source-of-truth surface.', '3. Identify which files are generated vs canonical.', '4. Only then make targeted edits.');
const outputPath = writeRepoFile(repoRoot, `.ai_repo_v2/llm-handoff-${slugify(task)}.txt`, parts.join('\n'));
~~~