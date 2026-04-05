---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/registry/tools_index.json"
source_name: "tools_index.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 118
selected_rank: 39
content_hash: "b7ec424b96af1582b1fe7047108f31c99203ada0719ab77ff45eb96617f0732f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "index"
  - "json"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/registry/tools_index.json

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/registry/tools_index.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 118
- Tags: brain, brain-scripts, index, json, neutral, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, index, json, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/registry/tools_index.json

## Excerpt

~~~json
[
  {
    "id": "list_files",
    "category": "files",
    "title": "List Files",
    "description": "List files in a directory.",
    "operation": "scan_dir",
    "tags": [
      "files",
      "inventory",
      "list"
    ],
    "intent_examples": [
      "list files",
      "show files in folder"
    ],
    "aliases": [],
    "inputs": {
      "path": "string",
      "recursive": "boolean optional"
    },
    "side_effects": [],
    "risk_level": "low",
    "supports_dry_run": false,
    "defaults": {
      "entryType": "file"
    },
    "entrypoint": "scripts/files/list_files.js"
~~~