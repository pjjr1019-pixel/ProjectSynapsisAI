---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-telemetry.mjs"
source_name: "optimizer-telemetry.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 658
content_hash: "76917f8913d0c8b71f71d9b5013ed7e3762ddf7c6b5a68a767d0e4208abe360e"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./optimizer-registry.mjs"
  - "node:os"
exports:
  - "acceptOsSnapshot"
  - "clearTelemetryHistory"
  - "collectTelemetry"
  - "comparePressure"
  - "computeSessionMode"
  - "getLatestOsSnapshot"
  - "getLatestTelemetry"
  - "getTelemetryHistory"
  - "isModuleIdleFor"
---

# taskmanager/portable_lib/optimizer-telemetry.mjs

> Code module; imports ./optimizer-registry.mjs, node:os; exports acceptOsSnapshot, clearTelemetryHistory, collectTelemetry, comparePressure

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-telemetry.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./optimizer-registry.mjs, node:os
- Exports: acceptOsSnapshot, clearTelemetryHistory, collectTelemetry, comparePressure, computeSessionMode, getLatestOsSnapshot

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-telemetry.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Telemetry Collector
 *
 * Collects a unified telemetry snapshot from all available sources:
 * - OS RAM (os.freemem / os.totalmem)
 * - Node.js heap (process.memoryUsage)
 * - Idle training / crawler state (INTERACTIVE_STATE + runtimeStates)
 * - Module registry summary
 * - GPU data when available (from Electron snapshot)
 *
 * The telemetry collector itself must be cheap to run:
 * - No subprocess spawning
 * - No disk I/O
 * - No sorting large arrays
 * - Completes within 5ms on target hardware
 */

import os from "node:os";
import { getRegistrySummary } from "./optimizer-registry.mjs";
import {
  getIdleTrainingSystemSnapshot,
  getInteractiveState,
} from "./brain-idle-training.mjs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
~~~