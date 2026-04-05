---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-query-decompose.mjs"
source_name: "brain-query-decompose.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 599
content_hash: "1d0f1328a186c1d3d78a4cb1cce8495c7d7662dbda2f6c9d1802c71de644ff36"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-text-tokens.mjs"
exports:
  - "decomposeQuery"
---

# taskmanager/portable_lib/brain-query-decompose.mjs

> Code module; imports ./brain-text-tokens.mjs; exports decomposeQuery

## Key Signals

- Source path: taskmanager/portable_lib/brain-query-decompose.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-text-tokens.mjs
- Exports: decomposeQuery

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-query-decompose.mjs

## Excerpt

~~~javascript
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

function cleanVariant(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,;:-]+/, "")
    .replace(/[,;:-]+$/, "");
}

function splitByConnectors(normalizedQuery) {
  const lower = String(normalizedQuery ?? "").trim();
  if (!lower) return [];
  const connectors = /\s+(?:and|plus|vs|versus)\s+|,\s*/i;
  const parts = lower
    .split(connectors)
    .map((part) => cleanVariant(part))
    .filter((part) => tokenizeForRetrieval(part).length >= 2);
  return [...new Set(parts)].slice(0, 3);
}

export function decomposeQuery(normalizedQuery, opts = {}) {
  const enabled =
    typeof opts.enabled === "boolean"
      ? opts.enabled
      : String(process.env.HORIZONS_BRAIN_QUERY_DECOMPOSE ?? "1").toLowerCase() !== "0";
  const tokens = tokenizeForRetrieval(normalizedQuery);
  const complexityScore =
~~~