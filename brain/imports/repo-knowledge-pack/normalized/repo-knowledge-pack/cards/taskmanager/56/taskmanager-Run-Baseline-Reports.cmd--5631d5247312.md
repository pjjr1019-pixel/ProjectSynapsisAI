---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/Run Baseline Reports.cmd"
source_name: "Run Baseline Reports.cmd"
top_level: "taskmanager"
surface: "other"
classification: "neutral"
kind: "batch"
language: "bat"
extension: ".cmd"
score: 20
selected_rank: 4008
content_hash: "b7e2273d28dd824bd730b11917a6b47195668532278e21cdeab091161b419830"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "batch"
  - "cmd"
  - "neutral"
  - "other"
  - "scripts"
---

# taskmanager/Run Baseline Reports.cmd

> Windows batch entrypoint

## Key Signals

- Source path: taskmanager/Run Baseline Reports.cmd
- Surface: other
- Classification: neutral
- Kind: batch
- Language: bat
- Top level: taskmanager
- Score: 20
- Tags: batch, cmd, neutral, other, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: batch, cmd, neutral, other, scripts, taskmanager
- Source link target: taskmanager/Run Baseline Reports.cmd

## Excerpt

~~~bat
@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%brain\scripts\repo-tools\00-run-baseline.js" %*
~~~