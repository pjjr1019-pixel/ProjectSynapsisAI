---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js"
source_name: "10-generate-repo-knowledge-pack.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 120
selected_rank: 36
content_hash: "56d7d9e839dd906a27c50d8f42af91012ba2fbe571b915d071d095768f966122"
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
  - "node:crypto"
  - "node:fs"
  - "node:path"
---

# taskmanager/brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js

> Script surface; imports ../lib/common, node:crypto, node:fs, node:path

## Key Signals

- Source path: taskmanager/brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 120
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../lib/common, node:crypto, node:fs, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js

## Excerpt

~~~javascript
#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  parseArgs,
  detectRepoRoot,
  loadConfig,
  classifyPath,
  isLikelyCode,
  isLikelyText,
  safeReadText,
  writeRepoFile,
  nowIso,
  extractImports,
  tokenize,
  groupBy,
  listAllEntries,
} = require("../lib/common");

const PACK_ID = "repo-knowledge-pack";
const IMPORT_ROOT_REL = path.posix.join("taskmanager", "brain", "imports", PACK_ID);
const RETRIEVAL_ROOT_REL = path.posix.join("taskmanager", "brain", "retrieval", "imports", PACK_ID);
const NORMALIZED_ROOT_REL = path.posix.join(IMPORT_ROOT_REL, "normalized", PACK_ID);
const INDEX_DOC_REL = path.posix.join(NORMALIZED_ROOT_REL, "INDEX.md");
const README_DOC_REL = path.posix.join(NORMALIZED_ROOT_REL, "README.md");
~~~