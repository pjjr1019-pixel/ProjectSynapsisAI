---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/LOOKUP_PROTOCOL.json"
source_name: "LOOKUP_PROTOCOL.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 110
selected_rank: 257
content_hash: "4836eb79de8077235371c0ccdd6d902f8fb492b29bc740f45ae5e774e47a8e87"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "scripts"
json_keys:
  - "confidence"
  - "module_id"
  - "outputs"
  - "protocol"
  - "steps"
---

# taskmanager/brain/scripts/windows/LOOKUP_PROTOCOL.json

> Script surface; keys confidence, module_id, outputs, protocol, steps

## Key Signals

- Source path: taskmanager/brain/scripts/windows/LOOKUP_PROTOCOL.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 110
- Tags: brain, brain-scripts, json, neutral, scripts
- JSON keys: confidence, module_id, outputs, protocol, steps

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/LOOKUP_PROTOCOL.json

## Excerpt

~~~json
{
  "protocol": "windows-skill-pack-lookup-v1",
  "module_id": "windows-js-skill-pack",
  "steps": [
    "search_aliases_and_ids",
    "rank_candidates",
    "validate_parameters",
    "select_executor",
    "enforce_safety_and_admin_policy",
    "execute_or_return_candidates"
  ],
  "confidence": {
    "execute_threshold": 0.75,
    "fallback_behavior": "return_top_3_candidates"
  },
  "outputs": {
    "on_execute": [
      "ok",
      "skill_id",
      "executor",
      "result",
      "meta"
    ],
    "on_fallback": [
      "ok",
      "candidates",
      "reason"
    ]
~~~