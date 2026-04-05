---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "scripts/00-run-baseline.js"
source_name: "00-run-baseline.js"
top_level: "scripts"
surface: "repo-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 81
selected_rank: 675
content_hash: "3296f3503e8c1032698826d89e3ddfc3b9d3c6478a04c51c0607451881878183"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "repo-scripts"
  - "scripts"
imports:
  - "../lib/common"
  - "child_process"
  - "path"
---

# scripts/00-run-baseline.js

> Script surface; imports ../lib/common, child_process, path

## Key Signals

- Source path: scripts/00-run-baseline.js
- Surface: repo-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: scripts
- Score: 81
- Tags: code, js, neutral, repo-scripts, scripts
- Imports: ../lib/common, child_process, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, repo-scripts, scripts
- Source link target: scripts/00-run-baseline.js

## Excerpt

~~~javascript
const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, detectRepoRoot } = require('../lib/common');

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const here = __dirname;

const steps = [
  '01-generate-focus-map.js',
  '02-generate-heavy-path-report.js',
  '03-generate-duplicate-name-report.js',
  '04-generate-import-hubs.js'
];

console.log(`Repo root: ${repoRoot}`);
for (const step of steps) {
  console.log(`\n==> Running ${step}`);
  const result = spawnSync(process.execPath, [path.join(here, step), '--repo', repoRoot], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('\nBaseline reports complete.');
console.log('Next useful commands:');
~~~