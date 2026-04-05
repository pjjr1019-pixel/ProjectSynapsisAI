---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/generate_repo_map.js"
source_name: "generate_repo_map.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 114
selected_rank: 108
content_hash: "74abdd55fb300011bdb3b515b85931b627059f2fb6e7d50cbde9f08dd13d4928"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "node:fs"
  - "node:path"
---

# taskmanager/brain/scripts/repo-tools/generate_repo_map.js

> Script surface; imports node:fs, node:path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/generate_repo_map.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 114
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: node:fs, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/generate_repo_map.js

## Excerpt

~~~javascript
#!/usr/bin/env node
/**
 * generate_repo_map.js
 * Generates a complete filesystem inventory of the repository.
 *
 * Outputs:
 *   REPO_MAP_FULL.md         — Full tree in markdown (chunked if large)
 *   REPO_MAP_FULL.txt        — Full tree in plain text
 *   REPO_MAP_FULL.json       — Machine-readable nested structure
 *   REPO_FILE_MANIFEST.csv   — One row per file/folder
 *   REPO_MAP_INDEX.md        — Index of chunked markdown files
 *   repo_map_chunks/         — Per-top-level-folder markdown chunks
 *   REPO_MAP_README.md       — Explains all outputs and how to regenerate
 *
 * Usage:
 *   node taskmanager/brain/scripts/repo-tools/generate_repo_map.js
 *   (run from repo root, or from anywhere — script self-locates)
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// ── Config ──────────────────────────────────────────────────────────────────

// 4 levels up: repo-tools/ → scripts/ → brain/ → taskmanager/ → Horizons.AI/
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");
~~~