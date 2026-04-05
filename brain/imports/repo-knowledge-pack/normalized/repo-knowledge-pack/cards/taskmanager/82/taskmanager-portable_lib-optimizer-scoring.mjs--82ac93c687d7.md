---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-scoring.mjs"
source_name: "optimizer-scoring.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 655
content_hash: "6ea08484ae6032251010a78097a047aa2699146dfd172594dd183f1a14cd2fcd"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./optimizer-registry.mjs"
exports:
  - "for"
  - "idleScore"
  - "interventionConfidence"
  - "keepWarmScore"
  - "overallPressureLevel"
  - "riskScore"
  - "scoreAllModules"
  - "stalenessScore"
  - "valueScore"
  - "wasteScore"
---

# taskmanager/portable_lib/optimizer-scoring.mjs

> Code module; imports ./optimizer-registry.mjs; exports for, idleScore, interventionConfidence, keepWarmScore

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-scoring.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./optimizer-registry.mjs
- Exports: for, idleScore, interventionConfidence, keepWarmScore, overallPressureLevel, riskScore

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-scoring.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Scoring Functions
 *
 * All scoring functions are pure (no side effects, no I/O).
 * Scores are integers 0–100 (higher = more of the quality described).
 *
 * All functions accept a module registry entry and optionally a telemetry snapshot.
 * They must never throw — invalid inputs return sensible defaults.
 */

import { ModuleType, ProtectionLevel } from "./optimizer-registry.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function secsSince(timestamp) {
  if (!timestamp) return Infinity;
  return Math.max(0, (Date.now() - timestamp) / 1000);
}

// ---------------------------------------------------------------------------
// 1. Idle Score (0 = busy, 100 = completely idle)
// ---------------------------------------------------------------------------
~~~