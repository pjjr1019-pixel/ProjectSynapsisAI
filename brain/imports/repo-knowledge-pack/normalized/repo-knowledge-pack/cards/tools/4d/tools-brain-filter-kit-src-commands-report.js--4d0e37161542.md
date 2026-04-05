---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/commands/report.js"
source_name: "report.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 24
selected_rank: 3396
content_hash: "1e9ff46c37de3d9e0fed1273689881e087d8c1975f0dd410091076fd2373ec78"
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

# tools/brain-filter-kit/src/commands/report.js

> Code module; imports ../utils, fs, path; exports run

## Key Signals

- Source path: tools/brain-filter-kit/src/commands/report.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 24
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ../utils, fs, path
- Exports: run

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/src/commands/report.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const { readJsonl } = require("../utils");

function groupCount(rows, key) {
  const out = {};
  for (const row of rows) {
    const k = row[key] ?? "unknown";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

async function run(ctx) {
  const inFile = path.join(ctx.outAbs, ctx.config.dedupedFile);
  const rows = readJsonl(inFile);
  const kept = rows.filter(r => r.includeForRetrieval && !r.duplicateOf);
  const duplicates = rows.filter(r => r.duplicateOf);
  const blocked = rows.filter(r => r.hardBlocked);

  const report = {
    totalFiles: rows.length,
    keptForRetrieval: kept.length,
    exactDuplicates: duplicates.length,
    hardBlocked: blocked.length,
    byTier: groupCount(rows, "tier"),
    bySourceType: groupCount(rows, "sourceType"),
    topDocs: kept
~~~