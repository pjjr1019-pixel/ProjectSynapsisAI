---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/registry/script_manifest.schema.json"
source_name: "script_manifest.schema.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 124
selected_rank: 14
content_hash: "ecca23d84c48727b71e2d8c517b58e25678194663d4a9333c1d8396e736ee823"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "manifest"
  - "neutral"
  - "scripts"
json_keys:
  - "$id"
  - "$schema"
  - "additionalProperties"
  - "properties"
  - "required"
  - "title"
  - "type"
---

# taskmanager/brain/scripts/registry/script_manifest.schema.json

> Script surface; keys $id, $schema, additionalProperties, properties, required, title

## Key Signals

- Source path: taskmanager/brain/scripts/registry/script_manifest.schema.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 124
- Tags: brain, brain-scripts, json, manifest, neutral, scripts
- JSON keys: $id, $schema, additionalProperties, properties, required, title, type

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, manifest, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/registry/script_manifest.schema.json

## Excerpt

~~~json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "horizons://brain/scripts/registry/script_manifest.schema.json",
  "title": "Horizons Script Manifest",
  "type": "object",
  "required": [
    "id",
    "title",
    "description",
    "category",
    "inputs",
    "outputs",
    "side_effects",
    "permissions_needed",
    "safe_to_autorun",
    "requires_confirmation",
    "timeout_seconds",
    "platform",
    "path",
    "version",
    "created_by",
    "last_verified"
  ],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "aliases": { "type": "array", "items": { "type": "string" } },
~~~