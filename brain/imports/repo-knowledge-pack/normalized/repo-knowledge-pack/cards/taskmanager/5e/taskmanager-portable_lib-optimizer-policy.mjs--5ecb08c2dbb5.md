---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-policy.mjs"
source_name: "optimizer-policy.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 653
content_hash: "1cfa9c8081076367987b63a6662f20601f7440ee1061aeef892f4293c2233ca9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "evaluateHardRules"
---

# taskmanager/portable_lib/optimizer-policy.mjs

> Code module; exports evaluateHardRules

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-policy.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Exports: evaluateHardRules

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-policy.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Policy Engine
 *
 * Two tiers of authority:
 *
 * Layer 1 — Hard Safety Rules (evaluateHardRules)
 *   Immutable rules that cannot be overridden by configuration or AI advisory.
 *   Any violation blocks the action entirely.
 *
 * Layer 2 — Policy Rules (evaluatePolicy)
 *   Deterministic rules that evaluate modules against current telemetry
 *   and generate typed action candidates with tier, confidence, and reason.
 *
 * All functions are pure — no I/O, no side effects.
 * The control loop calls these, then filters candidates through gateAction,
 * then passes approved candidates to optimizer-actions.mjs.
 */

import {
  ActionTier,
  ModuleType,
  ProtectionLevel,
} from "./optimizer-registry.mjs";
import {
  idleScore,
  stalenessScore,
  valueScore,
  wasteScore,
~~~