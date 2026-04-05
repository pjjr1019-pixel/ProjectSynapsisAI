---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/Start Task Manager.cmd"
source_name: "Start Task Manager.cmd"
top_level: "taskmanager"
surface: "other"
classification: "neutral"
kind: "batch"
language: "bat"
extension: ".cmd"
score: 14
selected_rank: 4431
content_hash: "de4e86a503e53fb95727176a094fdb680ebdd424ba8ea74ef89aaa6eb7fc55a9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "batch"
  - "cmd"
  - "neutral"
  - "other"
  - "scripts"
---

# taskmanager/Start Task Manager.cmd

> Windows batch entrypoint

## Key Signals

- Source path: taskmanager/Start Task Manager.cmd
- Surface: other
- Classification: neutral
- Kind: batch
- Language: bat
- Top level: taskmanager
- Score: 14
- Tags: batch, cmd, neutral, other, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: batch, cmd, neutral, other, scripts, taskmanager
- Source link target: taskmanager/Start Task Manager.cmd

## Excerpt

~~~bat
@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

echo Starting Horizons Task Manager...
call node desktop\run-electron-dev.cjs
set "EXIT_CODE=%ERRORLEVEL%"

popd

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Horizons Task Manager exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
~~~