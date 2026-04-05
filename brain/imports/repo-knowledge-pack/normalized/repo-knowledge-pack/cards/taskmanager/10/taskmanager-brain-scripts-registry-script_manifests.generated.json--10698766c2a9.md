---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/registry/script_manifests.generated.json"
source_name: "script_manifests.generated.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 124
selected_rank: 15
content_hash: "c4126058627815ee765ad94df9ae89ca0c18c21d851f527d62cf8562f4558053"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "manifest"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/registry/script_manifests.generated.json

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/registry/script_manifests.generated.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 124
- Tags: brain, brain-scripts, json, manifest, neutral, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, manifest, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/registry/script_manifests.generated.json

## Excerpt

~~~json
{
  "generatedAt": "2026-04-02T15:23:01.259Z",
  "count": 57,
  "malformedManifestCount": 0,
  "manifests": [
    {
      "id": "list_running_processes",
      "title": "List running processes",
      "description": "Collect normalized process rows with CPU, memory, PID, parent PID, and command metadata.",
      "aliases": [
        "show running processes"
      ],
      "tags": [
        "process",
        "task-manager",
        "windows"
      ],
      "category": "process",
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
~~~