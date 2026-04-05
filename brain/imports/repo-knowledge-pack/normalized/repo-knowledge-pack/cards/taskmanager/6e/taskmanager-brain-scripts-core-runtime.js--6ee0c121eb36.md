---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/core/runtime.js"
source_name: "runtime.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 28
selected_rank: 3393
content_hash: "a4623008f50c4b78641dd6df46a77f701e863ed5bc48b09380f16caee9e18803"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "../indexing/tool_catalog"
  - "child_process"
  - "fs"
  - "os"
  - "path"
---

# taskmanager/brain/scripts/core/runtime.js

> Script surface; imports ../indexing/tool_catalog, child_process, fs, os

## Key Signals

- Source path: taskmanager/brain/scripts/core/runtime.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 28
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ../indexing/tool_catalog, child_process, fs, os, path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/core/runtime.js

## Excerpt

~~~javascript
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const { TOOL_DEFINITIONS, TOOL_ALIASES, PLAYBOOKS, getCategoryCounts } = require("../indexing/tool_catalog");

const PROTECTED_PROCESS_NAMES = [
  "system",
  "registry",
  "smss",
  "csrss",
  "wininit",
  "services",
  "lsass",
  "svchost",
  "dwm",
  "explorer",
  "winlogon",
  "fontdrvhost",
  "sihost",
  "ctfmon",
  "taskhostw",
  "startmenuexperiencehost",
  "shellexperiencehost",
  "searchhost",
  "searchindexer",
  "memory compression",
  "secure system",
~~~