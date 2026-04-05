---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-contradictions.mjs"
source_name: "brain-contradictions.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 584
content_hash: "73bec5879febecccbae39db316b61776eab1c07adc3f8c0f181c56c4205ac837"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-runtime-layer.mjs"
  - "./brain-text-tokens.mjs"
  - "node:path"
exports:
  - "classifyPotentialContradiction"
  - "detectBrainContradictions"
---

# taskmanager/portable_lib/brain-contradictions.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs, node:path; exports classifyPotentialContradiction, detectBrainContradictions

## Key Signals

- Source path: taskmanager/portable_lib/brain-contradictions.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs, node:path
- Exports: classifyPotentialContradiction, detectBrainContradictions

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-contradictions.mjs

## Excerpt

~~~javascript
import path from "node:path";
import { ensureDir, writeJsonStable } from "./brain-build-utils.mjs";
import { loadAllNormalizedDocs, getBrainRuntimePaths } from "./brain-runtime-layer.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const NEGATION_RE = /\b(?:no|not|never|cannot|can't|disable|disabled|block|blocked|deny|denied|without)\b/i;
const POSITIVE_RE = /\b(?:allow|allowed|enable|enabled|supports?|include|includes|can|must|always)\b/i;

function overlapRatio(a, b) {
  const left = new Set(tokenizeForRetrieval(a));
  const right = new Set(tokenizeForRetrieval(b));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  for (const token of left) {
    if (right.has(token)) hits += 1;
  }
  return hits / Math.max(left.size, right.size);
}

export function classifyPotentialContradiction(leftText, rightText) {
  const overlap = overlapRatio(leftText, rightText);
  const leftNeg = NEGATION_RE.test(String(leftText ?? ""));
  const rightNeg = NEGATION_RE.test(String(rightText ?? ""));
  const leftPos = POSITIVE_RE.test(String(leftText ?? ""));
  const rightPos = POSITIVE_RE.test(String(rightText ?? ""));
  if (overlap >= 0.92) {
    return { label: "duplicate", confidence: overlap };
  }
~~~