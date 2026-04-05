---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/shared/task-manager-core.mjs"
source_name: "task-manager-core.mjs"
top_level: "taskmanager"
surface: "other"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 46
selected_rank: 3955
content_hash: "1957766709b7ef4d4a545fabc9f56c93889dd2fe492ddad1f9546975911d7f26"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "other"
  - "scripts"
exports:
  - "buildTaskManagerView"
  - "getProtectionReasons"
  - "HELPER_KEYWORDS"
  - "PROTECTED_PROCESS_NAMES"
  - "SECURITY_PROCESS_NAMES"
  - "TASK_MANAGER_POLL_BACKGROUND_MS"
  - "TASK_MANAGER_POLL_VISIBLE_MS"
  - "TASK_MANAGER_SNOOZE_MS"
  - "TOOLING_PROCESS_NAMES"
---

# taskmanager/shared/task-manager-core.mjs

> Code module; exports buildTaskManagerView, getProtectionReasons, HELPER_KEYWORDS, PROTECTED_PROCESS_NAMES

## Key Signals

- Source path: taskmanager/shared/task-manager-core.mjs
- Surface: other
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 46
- Tags: code, high-value, mjs, other, scripts
- Exports: buildTaskManagerView, getProtectionReasons, HELPER_KEYWORDS, PROTECTED_PROCESS_NAMES, SECURITY_PROCESS_NAMES, TASK_MANAGER_POLL_BACKGROUND_MS

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, other, scripts, taskmanager
- Source link target: taskmanager/shared/task-manager-core.mjs

## Excerpt

~~~javascript
const MB = 1024 * 1024;

export const TASK_MANAGER_POLL_VISIBLE_MS = 5_000;
export const TASK_MANAGER_POLL_BACKGROUND_MS = 15_000;
export const TASK_MANAGER_SNOOZE_MS = 60 * 60 * 1000;

export const PROTECTED_PROCESS_NAMES = Object.freeze([
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