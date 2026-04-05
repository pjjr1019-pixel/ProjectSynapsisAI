---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/commands/top-docs.js"
source_name: "top-docs.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 24
selected_rank: 3397
content_hash: "437e30d2f4a37c0aef53a19d56e6c65469916f7cdf268f191bd57d8128eb5d95"
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

# tools/brain-filter-kit/src/commands/top-docs.js

> Code module; imports ../utils, path; exports run

## Key Signals

- Source path: tools/brain-filter-kit/src/commands/top-docs.js
- Surface: tools
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: tools
- Score: 24
- Tags: brain, code, js, neutral, scripts, tools
- Imports: ../utils, path
- Exports: run

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, js, neutral, scripts, tools
- Source link target: tools/brain-filter-kit/src/commands/top-docs.js

## Excerpt

~~~javascript
const path = require("path");
const { readJsonl } = require("../utils");

async function run(ctx, rawLimit) {
  const inFile = path.join(ctx.outAbs, ctx.config.dedupedFile);
  const limit = Number(rawLimit || ctx.config.topDocsDefault);
  const rows = readJsonl(inFile)
    .filter(x => x.includeForRetrieval && !x.duplicateOf)
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, limit);

  for (const row of rows) {
    console.log(`${String(row.qualityScore).padStart(3)}  [${row.tier}]  ${String(row.sourceType).padEnd(10)}  ${row.path}`);
  }
}

module.exports = { run };
~~~