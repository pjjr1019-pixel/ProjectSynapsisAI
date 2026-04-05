---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/developer-mode-settings.mjs"
source_name: "developer-mode-settings.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 648
content_hash: "e1fb9eb8256a8850666cf3b09a545ba9b4f437286df289632227b734dd0a15bf"
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
  - "getDeveloperModeSettingsPath"
  - "readDeveloperModeSettings"
  - "updateDeveloperModeSettings"
  - "writeDeveloperModeSettings"
---

# taskmanager/portable_lib/developer-mode-settings.mjs

> Code module; imports ./taskmanager-paths.mjs, node:fs, node:path; exports getDeveloperModeSettingsPath, readDeveloperModeSettings, updateDeveloperModeSettings, writeDeveloperModeSettings

## Key Signals

- Source path: taskmanager/portable_lib/developer-mode-settings.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./taskmanager-paths.mjs, node:fs, node:path
- Exports: getDeveloperModeSettingsPath, readDeveloperModeSettings, updateDeveloperModeSettings, writeDeveloperModeSettings

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/developer-mode-settings.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const SETTINGS_PATH = getTaskmanagerPaths().brain.runtime.developerModeSettingsFile;

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  snapshot: {
    pollMs: 2500,
  },
  logs: {
    pollMs: 1500,
    limit: 120,
    source: "all",
  },
  chat: {
    streaming: true,
    localLlm: true,
    internet: false,
    profileName: "repo-knowledge-pack",
  },
  ui: {
    density: "compact",
    defaultInspector: "pipeline",
    defaultLogSource: "all",
  },
  features: {
~~~