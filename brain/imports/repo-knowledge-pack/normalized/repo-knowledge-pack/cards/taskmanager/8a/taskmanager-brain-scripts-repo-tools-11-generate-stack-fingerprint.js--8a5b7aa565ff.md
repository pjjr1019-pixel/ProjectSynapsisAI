---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/11-generate-stack-fingerprint.js"
source_name: "11-generate-stack-fingerprint.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 110
selected_rank: 254
content_hash: "b873f4fba2275ed7b1d77aee8dbfb12082ed15c4cbfdc40f77fc80d2fc59f0df"
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

# taskmanager/brain/scripts/repo-tools/11-generate-stack-fingerprint.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/11-generate-stack-fingerprint.js
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
- Source link target: taskmanager/brain/scripts/repo-tools/11-generate-stack-fingerprint.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const path = require('path');
const {
  parseArgs,
  detectRepoRoot,
  loadConfig,
  listAllEntries,
  writeRepoFile,
  safeReadJson,
  nowIso,
  relativeParent
} = require('../lib/common');

function normalize(value) { return String(value || '').replace(/\\/g, '/'); }

function relDepth(rel) {
  if (!rel || rel === '.') return 0;
  return normalize(rel).split('/').length;
}

function directPackageNameFromLockPath(lockPath) {
  const rel = normalize(lockPath);
  if (!rel.startsWith('node_modules/')) return null;
  const parts = rel.split('/');
  if (parts[1] && parts[1].startsWith('@')) {
    if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
    return null;
  }
~~~