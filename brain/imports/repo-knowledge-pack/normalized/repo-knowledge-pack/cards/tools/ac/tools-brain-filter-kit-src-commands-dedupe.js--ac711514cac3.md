---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/commands/dedupe.js"
source_name: "dedupe.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3412
content_hash: "80d7066acca91cc7e3a9a7221df80d3921ebfd8927131262ff3039ad02d99cb5"
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
  - "path"
exports:
  - "run"
---

# tools/brain-filter-kit/src/commands/dedupe.js

> Code module; imports ../utils, path; exports run

## Key Signals

- Source path: tools/brain-filter-kit/src/commands/dedupe.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 18
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ../utils, path
- Exports: run

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/src/commands/dedupe.js

## Excerpt

~~~javascript
const path = require("path");
const { readJsonl, writeJsonl } = require("../utils");

function tierRank(tier) {
  switch (tier) {
    case "gold": return 4;
    case "silver": return 3;
    case "bronze": return 2;
    default: return 1;
  }
}

function sourceRank(sourceType, ctx) {
  return (ctx.config.prioritySourceTypes || {})[sourceType] ?? 1;
}

function better(a, b, ctx) {
  const ar = sourceRank(a.sourceType, ctx) * 100 + tierRank(a.tier) * 10 + a.qualityScore;
  const br = sourceRank(b.sourceType, ctx) * 100 + tierRank(b.tier) * 10 + b.qualityScore;
  return ar >= br ? a : b;
}

async function run(ctx) {
  const inFile = path.join(ctx.outAbs, ctx.config.scoredFile);
  const rows = readJsonl(inFile);
  const groups = new Map();

  for (const row of rows) {
~~~