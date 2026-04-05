---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "run-token-saver.cmd"
source_name: "run-token-saver.cmd"
top_level: "run-token-saver.cmd"
surface: "other"
classification: "neutral"
kind: "batch"
language: "bat"
extension: ".cmd"
score: 6
selected_rank: 4452
content_hash: "c2f79ed421aeda09d1dc2c68c7a9a234041c8411db66770ff4629d16769bc3e7"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "batch"
  - "cmd"
  - "neutral"
  - "other"
  - "scripts"
---

# run-token-saver.cmd

> Windows batch entrypoint

## Key Signals

- Source path: run-token-saver.cmd
- Surface: other
- Classification: neutral
- Kind: batch
- Language: bat
- Top level: run-token-saver.cmd
- Score: 6
- Tags: batch, cmd, neutral, other, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: batch, cmd, neutral, other, run-token-saver.cmd, scripts
- Source link target: run-token-saver.cmd

## Excerpt

~~~bat
@echo off
setlocal

REM Change to the repo root directory (if not already there)
cd /d "%~dp0"

REM Run the token saver baseline script
node _repo_token_saver_ultimate_pack\_repo_token_saver_ultimate_pack\scripts\00-run-ultimate-baseline.js

set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Token Saver exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
~~~