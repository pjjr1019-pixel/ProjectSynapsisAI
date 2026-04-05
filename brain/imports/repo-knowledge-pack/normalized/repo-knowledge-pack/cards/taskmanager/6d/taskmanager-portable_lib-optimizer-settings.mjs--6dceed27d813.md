---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-settings.mjs"
source_name: "optimizer-settings.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 656
content_hash: "358d31afca40c25d1e20351188fe7d45a48a5c3c18141cc28fbec51ca640770b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./taskmanager-paths.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "getOptimizerSettingsPath"
  - "OPTIMIZER_PERFORMANCE_MODES"
  - "readOptimizerSettings"
  - "setOptimizerKillSwitch"
  - "setOptimizerModulePolicy"
  - "setOptimizerPerformanceMode"
  - "updateOptimizerSettings"
  - "writeOptimizerSettings"
---

# taskmanager/portable_lib/optimizer-settings.mjs

> Code module; imports ./taskmanager-paths.mjs, node:fs, node:path; exports getOptimizerSettingsPath, OPTIMIZER_PERFORMANCE_MODES, readOptimizerSettings, setOptimizerKillSwitch

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-settings.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./taskmanager-paths.mjs, node:fs, node:path
- Exports: getOptimizerSettingsPath, OPTIMIZER_PERFORMANCE_MODES, readOptimizerSettings, setOptimizerKillSwitch, setOptimizerModulePolicy, setOptimizerPerformanceMode

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-settings.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const SETTINGS_PATH = getTaskmanagerPaths().brain.runtime.optimizerSettingsFile;

export const OPTIMIZER_PERFORMANCE_MODES = Object.freeze([
  "max-performance",
  "balanced",
  "low-resource",
  "background-maintenance",
  "emergency",
]);

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  killSwitchActive: false,
  performanceMode: "balanced",
  intervalMs: {
    low: 60_000,
    moderate: 15_000,
    high: 5_000,
    critical: 5_000,
    active: 30_000,
  },
  thresholds: {
    autoMinConfidence: 75,
    recommendMinConfidence: 45,
~~~