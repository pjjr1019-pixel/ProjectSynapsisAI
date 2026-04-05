---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/commands/inventory.js"
source_name: "inventory.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3413
content_hash: "b0d082a815a5654d343391304032a6cc171345f6e93afaa9ad06e62ea2fe3787"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
  - "tools"
imports:
  - "../utils"
  - "fs"
  - "path"
exports:
  - "run"
---

# tools/brain-filter-kit/src/commands/inventory.js

> Code module; imports ../utils, fs, path; exports run

## Key Signals

- Source path: tools/brain-filter-kit/src/commands/inventory.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ../utils, fs, path
- Exports: run

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/src/commands/inventory.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const {
  sha256,
  isTextFile,
  estimateTokens,
  classifyPath,
  isHardBlocked,
  relPathFromRoot,
  walk,
  writeJsonl
} = require("../utils");

async function run(ctx) {
  const files = walk(ctx.rootAbs, ctx.config);
  const rows = [];

  for (const fileAbs of files) {
    const rel = relPathFromRoot(ctx.rootAbs, fileAbs);
    const stat = fs.statSync(fileAbs);
    let isText = isTextFile(fileAbs, ctx.config);
    let lineCount = 0;
    let tokenEstimate = 0;
    let hash = "";
    let readError = null;

    try {
      const buf = fs.readFileSync(fileAbs);
~~~