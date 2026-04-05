---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/data/macros/macros.json"
source_name: "macros.json"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 12
selected_rank: 4442
content_hash: "fac085cebc35068edda4d2208948be8402306c27a798587e31bc2da79d8b498f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "json"
  - "neutral"
  - "source"
json_keys:
  - "macros"
---

# taskmanager/brain/data/macros/macros.json

> JSON data file; keys macros

## Key Signals

- Source path: taskmanager/brain/data/macros/macros.json
- Surface: source
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 12
- Tags: brain, json, neutral, source
- JSON keys: macros

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, json, neutral, source, taskmanager
- Source link target: taskmanager/brain/data/macros/macros.json

## Excerpt

~~~json
{
  "macros": {
    "free-memory": {
      "description": "Build context, inspect hotspots, and summarize memory pressure.",
      "steps": [
        { "type": "context", "name": "Collect context" },
        { "type": "health", "name": "Summarize health" },
        { "type": "summary", "name": "Finalize" }
      ]
    },
    "kill-hotspot": {
      "description": "Inspect an intent, decompose it, and compile the resulting actions.",
      "steps": [
        { "type": "intent", "name": "Parse intent" },
        { "type": "decompose", "name": "Break into tasks" },
        { "type": "plan", "name": "Plan workflow" },
        { "type": "compile", "name": "Compile actions" }
      ]
    },
    "analyze-startup": {
      "description": "Build a startup-oriented context pack and summarize the output.",
      "steps": [
        { "type": "context", "name": "Build context" },
        { "type": "summary", "name": "Summarize" }
      ]
    },
    "summarize-health": {
      "description": "Summarize optimizer health with deterministic templates.",
~~~