---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/registry/tools_index.json"
source_name: "tools_index.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 118
selected_rank: 40
content_hash: "5b376ec24b6ebecaa13169f4bfed98902df6f9ed779b81e1ad2f863404d9fb5d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "index"
  - "json"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/registry/tools_index.json

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/registry/tools_index.json
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
- Source link target: taskmanager/brain/scripts/registry/tools_index.json

## Excerpt

~~~json
[
  {
    "id": "list_running_processes",
    "title": "List running processes",
    "description": "Collect normalized process rows with CPU, memory, PID, parent PID, and command metadata.",
    "category": "process",
    "tags": [
      "process",
      "task-manager",
      "windows"
    ],
    "intent_examples": [
      "list running processes"
    ],
    "avoid_if": [],
    "inputs": {
      "limit": {
        "type": "number",
        "default": 25
      },
      "query": {
        "type": "string",
        "default": ""
      },
      "sort_by": {
        "type": "string",
        "default": "memory_mb"
      },
~~~