---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-control-loop.mjs"
source_name: "optimizer-control-loop.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 652
content_hash: "0f2f707f4b8a05bf1aa8daef5d2024d50391b60553bb01f9e77fac5e6d686954"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "../brain/scripts/ai-toolkit/index.mjs"
  - "./brain-idle-training.mjs"
  - "./brain-runtime-settings.mjs"
  - "./optimizer-audit.mjs"
  - "./optimizer-policy.mjs"
  - "./optimizer-telemetry.mjs"
  - "node:os"
exports:
  - "setKillSwitch"
  - "setPerformanceMode"
  - "startOptimizerControlLoop"
  - "stopOptimizerControlLoop"
---

# taskmanager/portable_lib/optimizer-control-loop.mjs

> Code module; imports ../brain/scripts/ai-toolkit/index.mjs, ./brain-idle-training.mjs, ./brain-runtime-settings.mjs, ./optimizer-audit.mjs; exports setKillSwitch, setPerformanceMode, startOptimizerControlLoop, stopOptimizerControlLoop

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-control-loop.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ../brain/scripts/ai-toolkit/index.mjs, ./brain-idle-training.mjs, ./brain-runtime-settings.mjs, ./optimizer-audit.mjs, ./optimizer-policy.mjs, ./optimizer-telemetry.mjs
- Exports: setKillSwitch, setPerformanceMode, startOptimizerControlLoop, stopOptimizerControlLoop

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-control-loop.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Control Loop
 *
 * The central coordinator for the AI Task Manager & Optimization Layer.
 * Runs on an adaptive interval (5–60 seconds) depending on resource pressure.
 *
 * Each tick:
 * 1. Collect telemetry snapshot
 * 2. Update module registry from live data (crawlers)
 * 3. Evaluate policy for all modules
 * 4. Gate candidates through hard rules + health gate + kill switch
 * 5. Execute AUTO-tier actions (max 3 per tick)
 * 6. Queue RECOMMEND-tier candidates for the UI
 * 7. Log OBSERVE-tier candidates
 * 8. Schedule health checks for executed actions
 * 9. Adapt tick interval to pressure level
 *
 * Start by calling startOptimizerControlLoop() once from server/index.mjs.
 * The loop is non-blocking — each tick is async but errors do not crash the server.
 */

import os from "node:os";
import {
  initializeRegistry,
  updateModuleState,
  noteModuleActivity,
  ModuleState,
  ActionTier,
~~~