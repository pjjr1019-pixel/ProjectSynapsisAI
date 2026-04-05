---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-calculator.mjs"
source_name: "brain-calculator.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 580
content_hash: "c8c21e0e74358a61a1223b7e98d55a89617e97c0ec7f5a3eab33d3ff3ddf8ebc"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "expr-eval"
exports:
  - "tryMathReply"
---

# taskmanager/portable_lib/brain-calculator.mjs

> Code module; imports expr-eval; exports tryMathReply

## Key Signals

- Source path: taskmanager/portable_lib/brain-calculator.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: expr-eval
- Exports: tryMathReply

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-calculator.mjs

## Excerpt

~~~javascript
/**
 * Safe arithmetic via expr-eval (no eval of arbitrary JS).
 *
 * Symbolic: + − × ÷ * / ^ %, parentheses, unicode operators, letter x between digits,
 * thousands commas, sqrt / √, comparisons, expr-eval (sin, cos, log, pi, e, …).
 *
 * Natural language (rewritten to expressions): "add 10 to 30", "subtract 5 from 20",
 * "multiply 3 by 4", "divide 100 by 5", "sum of 2 and 3", "20 percent of 50", "50% of 200", etc.
 */
import { Parser } from "expr-eval";

const parser = new Parser();
const MAX_LEN = 800;

/**
 * Unicode / typed operators → ASCII; thousands commas; letter x between digits → *.
 */
function normalizeMathWords(s) {
  let t = String(s ?? "")
    .normalize("NFKC")
    .replace(/\u2212|\u2013|\u2014/g, "-")
    .replace(/[\u00d7\u2715\u2a09\u2a2f\u22c7]/g, "*")
    .replace(/\u00f7|÷/g, "/");

  t = t.replace(/\u221a\s*\(([^)]+)\)/g, "sqrt($1)");
  t = t.replace(/\u221a\s*(\d+(?:\.\d+)?)/g, "sqrt($1)");

  t = t
~~~