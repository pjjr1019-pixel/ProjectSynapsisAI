---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/10-rank-root-manifests.js"
source_name: "10-rank-root-manifests.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 130
selected_rank: 7
content_hash: "b543b63f5cc4f7cc7f37e2a42c292f7d20401fccef6e31f6303a0750a5b4a3ed"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "manifest"
  - "neutral"
  - "scripts"
imports:
  - "../lib/common"
  - "path"
---

# taskmanager/brain/scripts/repo-tools/10-rank-root-manifests.js

> Script surface; imports ../lib/common, path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/10-rank-root-manifests.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 130
- Tags: brain, brain-scripts, code, js, manifest, neutral, scripts
- Imports: ../lib/common, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, manifest, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/10-rank-root-manifests.js

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

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function relDepth(rel) {
  if (!rel || rel === '.') return 0;
  return normalizeSlashes(rel).split('/').length;
}

function hasBadPath(rel, config) {
  const lower = normalizeSlashes(rel).toLowerCase();
  return (config.rootManifestSignals.badPathTokens || []).some((token) => lower.includes(token.toLowerCase()));
}

function nearbyLockScore(dirRel, lockfiles) {
~~~