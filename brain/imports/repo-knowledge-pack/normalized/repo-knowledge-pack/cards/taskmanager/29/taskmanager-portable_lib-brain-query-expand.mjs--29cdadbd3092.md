---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-query-expand.mjs"
source_name: "brain-query-expand.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 600
content_hash: "3530325e1f3089622b824f7396b622c6093eeb859fe450c4ff99200e2b85825b"
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
  - "expandQueryWithHyde"
---

# taskmanager/portable_lib/brain-query-expand.mjs

> Code module; imports ./brain-text-tokens.mjs; exports expandQueryWithHyde

## Key Signals

- Source path: taskmanager/portable_lib/brain-query-expand.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-text-tokens.mjs
- Exports: expandQueryWithHyde

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-query-expand.mjs

## Excerpt

~~~javascript
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

function shouldUseHyde(query) {
  const tokens = tokenizeForRetrieval(query);
  if (tokens.length < 4) return false;
  if (tokens.length > 8) return true;
  return /\b(?:how|why|compare|difference|workflow|policy|features?|capabilities?)\b/i.test(
    String(query ?? "")
  );
}

function buildHeuristicPassage(query) {
  const clean = String(query ?? "").trim().replace(/[?.!]+$/g, "");
  return `Horizons knowledge that answers "${clean}" would describe the relevant workflows, features, policies, constraints, and supporting source material for that topic.`;
}

export function expandQueryWithHyde(normalizedQuery, opts = {}) {
  const enabled =
    typeof opts.enabled === "boolean"
      ? opts.enabled
      : String(process.env.HORIZONS_BRAIN_QUERY_EXPAND ?? "1").toLowerCase() !== "0";
  if (!enabled) {
    return {
      enabled: false,
      strategy: "off",
      original: normalizedQuery,
      hypothetical: "",
      variants: [normalizedQuery],
~~~