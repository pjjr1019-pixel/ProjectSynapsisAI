---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/commands/build-corpus.js"
source_name: "build-corpus.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: -62
selected_rank: 3896
content_hash: "14a684551282022d33b25a0f76e5cf2bc93edb14163c04de9c09155ed63a0225"
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

# tools/brain-filter-kit/src/commands/build-corpus.js

> Code module; imports ../utils, fs, path; exports run

## Key Signals

- Source path: tools/brain-filter-kit/src/commands/build-corpus.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: -62
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ../utils, fs, path
- Exports: run

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/src/commands/build-corpus.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const { readJsonl, ensureDir } = require("../utils");

function copyKeepStructure(rootAbs, relPath, destRoot) {
  const src = path.join(rootAbs, relPath);
  const dst = path.join(destRoot, relPath);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

async function run(ctx) {
  const inFile = path.join(ctx.outAbs, ctx.config.dedupedFile);
  const rows = readJsonl(inFile);
  const approvedAbs = path.join(ctx.outAbs, ctx.config.approvedDir);
  const quarantineAbs = path.join(ctx.outAbs, ctx.config.quarantineDir);
  ensureDir(approvedAbs);
  ensureDir(quarantineAbs);

  let kept = 0;
  let quarantined = 0;
  let skipped = 0;

  const quarantineRows = [];

  for (const row of rows) {
    const shouldKeep = row.includeForRetrieval && row.tier !== "ignore" && !row.duplicateOf && row.isText;
    if (shouldKeep) {
~~~