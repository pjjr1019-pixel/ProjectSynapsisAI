---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "lib/common.js"
source_name: "common.js"
top_level: "lib"
surface: "other"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 14
selected_rank: 3423
content_hash: "67cf86b930e49f5ed06a5707bb4623a960efb2d6cdb4b51db9b0d8b4ee783541"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "other"
  - "scripts"
imports:
  - "fs"
  - "path"
exports:
  - "PACK_ROOT,\n  DEFAULT_REPO_ROOT,\n  OUTPUT_DIR_NAME,\n  parseArgs,\n  normalize,\n  detectRepoRoot,\n  loadConfig,\n  ensureDir,\n  outputDir,\n  writeRepoFile,\n  safeReadText,\n  safeReadJson,\n  listAllEntries,\n  classifyPath,\n  isLikelyCode,\n  isLikelyText,\n  tokenize,\n  scorePathForTask,\n  topN,\n  renderList,\n  nowIso,\n  slugify,\n  groupBy,\n  collectDirectoryFileCounts,\n  extractImports,\n  resolveRelativeImport,\n  discoverImportantFiles,\n  discoverProjectMetadata"
---

# lib/common.js

> Code module; imports fs, path; exports PACK_ROOT,
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
  safeReadJson,
  listAllEntries,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  tokenize,
  scorePathForTask,
  topN,
  renderList,
  nowIso,
  slugify,
  groupBy,
  collectDirectoryFileCounts,
  extractImports,
  resolveRelativeImport,
  discoverImportantFiles,
  discoverProjectMetadata

## Key Signals

- Source path: lib/common.js
- Surface: other
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: lib
- Score: 14
- Tags: code, js, neutral, other, scripts
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
  safeReadJson,
  listAllEntries,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  tokenize,
  scorePathForTask,
  topN,
  renderList,
  nowIso,
  slugify,
  groupBy,
  collectDirectoryFileCounts,
  extractImports,
  resolveRelativeImport,
  discoverImportantFiles,
  discoverProjectMetadata

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, lib, neutral, other, scripts
- Source link target: lib/common.js

## Excerpt

~~~javascript
const fs = require('fs');
const path = require('path');

const PACK_ROOT = path.resolve(__dirname, '..');
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
  }
~~~