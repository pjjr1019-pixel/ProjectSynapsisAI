---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "artifacts/integration_reports/latest/capabilities.json"
source_name: "capabilities.json"
top_level: "artifacts"
surface: "source"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 12
selected_rank: 4436
content_hash: "4d44923f9881760c36bb4bf929cd11d62e87635f8519ed0146332f50ef403840"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "json"
  - "neutral"
  - "source"
  - "tests"
---

# artifacts/integration_reports/latest/capabilities.json

> JSON data file

## Key Signals

- Source path: artifacts/integration_reports/latest/capabilities.json
- Surface: source
- Classification: neutral
- Kind: json
- Language: json
- Top level: artifacts
- Score: 12
- Tags: json, neutral, source, tests

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: artifacts, json, neutral, source, tests
- Source link target: artifacts/integration_reports/latest/capabilities.json

## Excerpt

~~~json
{
  "boot_commands": {
    "taskmanager_build": "tsc --noEmit && vite build",
    "taskmanager_dev": "vite --host 127.0.0.1 --port 5180 --strictPort",
    "taskmanager_dev_api": "node server/dev-api.mjs",
    "taskmanager_specialist_tests": "node --test tests/specialist/*.test.mjs",
    "taskmanager_start": "node desktop/run-electron-dev.cjs"
  },
  "features": {
    "approvals_timeline_panel": {
      "classification": "partial",
      "evidence": [
        "taskmanager/src/App.tsx",
        "taskmanager/server/http-routes.mjs"
      ],
      "group": "ui_panels",
      "key": "approvals_timeline_panel",
      "name": "Approvals timeline panel",
      "notes": [],
      "reason": "Pending approvals are surfaced inside the Task Manager shell rather than as a dedicated tab.",
      "surfaces": [
        "ui",
        "taskmanager",
        "backend"
      ]
    },
    "approvals_workflow": {
      "classification": "integrated",
~~~