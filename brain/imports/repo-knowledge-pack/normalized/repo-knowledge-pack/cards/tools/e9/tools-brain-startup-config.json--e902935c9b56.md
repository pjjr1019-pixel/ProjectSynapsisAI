---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-startup/config.json"
source_name: "config.json"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 20
selected_rank: 3405
content_hash: "a5e7497eaffacc8ffec9b5f06ad75a95c4569c7514d549bbb94ba17df7266b63"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "config"
  - "json"
  - "neutral"
  - "tools"
json_keys:
  - "approvedCorpusDirName"
  - "fullRebuildThresholdChangedFiles"
  - "fullRebuildThresholdChangeRatio"
  - "hardBlockDirs"
  - "hardBlockExts"
  - "hardBlockFiles"
  - "hardBlockPathFragments"
  - "includeTextExts"
  - "logDirName"
  - "logFileName"
  - "outputRoot"
  - "sourceCandidates"
  - "sourceTypePriority"
  - "staleLockMinutes"
  - "stateDirName"
---

# tools/brain-startup/config.json

> JSON data file; keys approvedCorpusDirName, fullRebuildThresholdChangedFiles, fullRebuildThresholdChangeRatio, hardBlockDirs, hardBlockExts, hardBlockFiles

## Key Signals

- Source path: tools/brain-startup/config.json
- Surface: tools
- Classification: neutral
- Kind: json
- Language: json
- Top level: tools
- Score: 20
- Tags: brain, config, json, neutral, tools
- JSON keys: approvedCorpusDirName, fullRebuildThresholdChangedFiles, fullRebuildThresholdChangeRatio, hardBlockDirs, hardBlockExts, hardBlockFiles, hardBlockPathFragments, includeTextExts, logDirName, logFileName

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, config, json, neutral, tools
- Source link target: tools/brain-startup/config.json

## Excerpt

~~~json
{
  "sourceCandidates": [
    "taskmanager/brain",
    "brain"
  ],
  "outputRoot": "taskmanager/brain_runtime_filter",
  "approvedCorpusDirName": "approved_corpus",
  "stateDirName": "state",
  "logDirName": "logs",
  "logFileName": "brain-startup.log",
  "staleLockMinutes": 180,
  "fullRebuildThresholdChangedFiles": 500,
  "fullRebuildThresholdChangeRatio": 0.2,
  "hardBlockDirs": [
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    ".cache",
    "cache",
    "tmp",
    "temp",
    "logs",
    ".venv",
    "venv",
~~~