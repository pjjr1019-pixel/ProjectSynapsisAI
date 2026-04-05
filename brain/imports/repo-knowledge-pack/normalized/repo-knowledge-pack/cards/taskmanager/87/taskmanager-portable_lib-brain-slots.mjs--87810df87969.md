---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-slots.mjs"
source_name: "brain-slots.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 611
content_hash: "dc3932bf9955df9eaf6dc485f528065d12a3b517263eaeeb25bb508cf5a1a542"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "extractSlots"
---

# taskmanager/portable_lib/brain-slots.mjs

> Code module; exports extractSlots

## Key Signals

- Source path: taskmanager/portable_lib/brain-slots.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Exports: extractSlots

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-slots.mjs

## Excerpt

~~~javascript
/**
 * Lightweight regex slot extraction for retrieval boosting (no ML).
 * Returns structured hints appended as synthetic query terms.
 */
export function extractSlots(text) {
  const t = String(text);
  const hints = [];

  const tickers = t.match(/\b([A-Z]{1,5})\b/g);
  if (tickers) {
    for (const x of tickers) {
      if (x.length >= 2 && x !== "AI" && x !== "OK") hints.push(`ticker_${x}`);
    }
  }

  const money = t.match(/\$?\d[\d,]*(?:\.\d+)?\s*(?:k|m|b|usd|dollars?)?/gi);
  if (money) hints.push("has_amount");

  if (/\b20\d{2}\b/.test(t)) hints.push("has_year");

  return [...new Set(hints)];
}
~~~