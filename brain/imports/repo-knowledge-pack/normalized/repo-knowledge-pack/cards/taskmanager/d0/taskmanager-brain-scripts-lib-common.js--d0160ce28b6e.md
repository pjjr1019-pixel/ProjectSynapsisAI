---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/lib/common.js"
source_name: "common.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 480
content_hash: "e07f5d01484aa2caa0569694c6e4698fd50ef2ca8d5cc85065405c7f36eed3be"
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
exports:
  - "PACK_ROOT,\n  DEFAULT_REPO_ROOT,\n  OUTPUT_DIR_NAME,\n  parseArgs,\n  normalize,\n  detectRepoRoot,\n  loadConfig,\n  ensureDir,\n  outputDir,\n  writeRepoFile,\n  safeReadText,\n  listAllEntries,\n  classifyPath,\n  isLikelyCode,\n  isLikelyText,\n  tokenize,\n  scorePathForTask,\n  topN,\n  renderList,\n  nowIso,\n  groupBy,\n  collectDirectoryFileCounts,\n  extractImports,\n  resolveRelativeImport"
---

# taskmanager/brain/scripts/lib/common.js

> Script surface; imports fs, path; exports PACK_ROOT,
  DEFAULT_REPO_ROOT,
  OUTPUT_DIR_NAME,
  parseArgs,
  normalize,
  detectRepoRoot,
  loadConfig,
  ensureDir,
  outputDir,
  writeRepoFile,
  safeReadText,
  listAllEntries,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  tokenize,
  scorePathForTask,
  topN,
  renderList,
  nowIso,
  groupBy,
  collectDirectoryFileCounts,
  extractImports,
  resolveRelativeImport

## Key Signals

- Source path: taskmanager/brain/scripts/lib/common.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: fs, path
- Exports: PACK_ROOT,
  DEFAULT_REPO_ROOT,
  OUTPUT_DIR_NAME,
  parseArgs,
  normalize,
  detectRepoRoot,
  loadConfig,
  ensureDir,
  outputDir,
  writeRepoFile,
  safeReadText,
  listAllEntries,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  tokenize,
  scorePathForTask,
  topN,
  renderList,
  nowIso,
  groupBy,
  collectDirectoryFileCounts,
  extractImports,
  resolveRelativeImport

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/lib/common.js

## Excerpt

~~~javascript
const fs = require('fs');
const path = require('path');

// PACK_ROOT: taskmanager/ (3 levels up from taskmanager/brain/scripts/lib/)
const PACK_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_REPO_ROOT = path.resolve(PACK_ROOT, '..');
const OUTPUT_DIR_NAME = '.ai_repo';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        out[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          out[arg.slice(2)] = next;
          i += 1;
        } else {
          out[arg.slice(2)] = true;
        }
      }
    } else {
      out._.push(arg);
    }
~~~