---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/integrate.js"
source_name: "integrate.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 361
content_hash: "e1c48951f6cfafcc2d2790a6bab979cfcd0258fb08b60f94a438f6098ff255cf"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "fs"
  - "path"
headings:
  - "How Files Were Reorganized"
  - "What Was Found"
  - "What Was Unpacked"
---

# taskmanager/brain/scripts/_staging/integrate.js

> Script surface; imports fs, path; headings How Files Were Reorganized / What Was Found / What Was Unpacked

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/integrate.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: fs, path
- Headings: How Files Were Reorganized | What Was Found | What Was Unpacked

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/integrate.js

## Excerpt

~~~javascript
'use strict';
/**
 * Integration script — merges tiny_tool_pack_v1, guarded_tool_pack_v2, repo_coder_tool_pack_v3
 * into taskmanager/brain/scripts/ with category structure, unified registry, and reports.
 */
const fs   = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const STAGING   = __dirname;
const TARGET    = path.resolve(__dirname, '..');   // taskmanager/brain/scripts/
const CONFLICTS = path.join(TARGET, 'staging_review', 'conflicts');

const PACKS = [
  { name: 'tiny_tool_pack_v1',       dir: path.join(STAGING, 'tiny_tool_pack_v1',       'tiny_tool_pack_v1') },
  { name: 'guarded_tool_pack_v2',    dir: path.join(STAGING, 'guarded_tool_pack_v2',    'guarded_tool_pack_v2') },
  { name: 'repo_coder_tool_pack_v3', dir: path.join(STAGING, 'repo_coder_tool_pack_v3', 'repo_coder_tool_pack_v3') },
];

// ── Category mapping: pack-relative source prefix → target subdir ─────────────
// v1
const V1_MAP = [
  ['scripts/csv',       'csv'],
  ['scripts/files',     'files'],
  ['scripts/json',      'json'],
  ['scripts/paths',     'files'],         // paths utilities live in files/
  ['scripts/repo',      'repo'],
  ['scripts/safe_write','files'],         // safe write utilities live in files/
~~~