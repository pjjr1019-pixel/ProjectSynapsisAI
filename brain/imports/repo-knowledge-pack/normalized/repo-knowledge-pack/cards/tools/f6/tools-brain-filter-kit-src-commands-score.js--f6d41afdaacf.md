---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/src/commands/score.js"
source_name: "score.js"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 18
selected_rank: 3414
content_hash: "624b4e0d7276f786db7d3a35416696d80b3943a490327afda0b88d8441b353a7"
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

# tools/brain-filter-kit/src/commands/score.js

> Code module; imports ../utils, path; exports run

## Key Signals

- Source path: tools/brain-filter-kit/src/commands/score.js
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
- Source link target: tools/brain-filter-kit/src/commands/score.js

## Excerpt

~~~javascript
const path = require("path");
const { readJsonl, writeJsonl, safeReadUtf8 } = require("../utils");

function tier(score) {
  if (score >= 80) return "gold";
  if (score >= 55) return "silver";
  if (score >= 30) return "bronze";
  return "ignore";
}

function scoreRow(row, ctx) {
  const config = ctx.config;
  let score = 0;
  const reasons = [];
  const p = String(row.path || "").toLowerCase();

  if (!row.isText) {
    return { score: -100, reasons: ["non_text"] };
  }

  if (row.hardBlocked) {
    score -= 80;
    reasons.push("hard_blocked");
  }

  switch (row.sourceType) {
    case "canonical": score += 35; reasons.push("canonical"); break;
    case "memory": score += 18; reasons.push("memory"); break;
~~~