---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/12-generate-portable-boundaries.js"
source_name: "12-generate-portable-boundaries.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 255
content_hash: "8a7de591f3802acb5b85451a13cc5039b423e5bc8109951abf1daff8cfc8a58c"
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

# taskmanager/brain/scripts/repo-tools/12-generate-portable-boundaries.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/12-generate-portable-boundaries.js
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
- Source link target: taskmanager/brain/scripts/repo-tools/12-generate-portable-boundaries.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const {
  parseArgs,
  detectRepoRoot,
  listAllEntries,
  writeRepoFile,
  safeReadJson,
  nowIso
} = require('../lib/common');

function normalize(value) { return String(value || '').replace(/\\/g, '/'); }
function directPackageNameFromLockPath(lockPath) {
  const rel = normalize(lockPath);
  if (!rel.startsWith('node_modules/')) return null;
  const parts = rel.split('/');
  if (parts[1] && parts[1].startsWith('@')) {
    if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
    return null;
  }
  return parts[1] || null;
}

const args = parseArgs(process.argv);
const repoRoot = detectRepoRoot(args);
const { entries } = listAllEntries(repoRoot);
const lockfile = entries.find((e) => e.type === 'file' && /(^|\/)\.package-lock\.json$/i.test(e.rel))
  || entries.find((e) => e.type === 'file' && /(^|\/)package-lock\.json$/i.test(e.rel));
~~~