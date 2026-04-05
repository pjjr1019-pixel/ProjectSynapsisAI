---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/tools/source-package.json"
source_name: "source-package.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 136
selected_rank: 1
content_hash: "65f53fbcd6e2a422b3d8b219a6a18e73c8655b496ec7c1084b778c04fb6bb055"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "package-manifest"
  - "scripts"
json_keys:
  - "bin"
  - "description"
  - "engines"
  - "license"
  - "main"
  - "name"
  - "scripts"
  - "type"
  - "version"
---

# taskmanager/brain/scripts/windows/tools/source-package.json

> Script surface; keys bin, description, engines, license, main, name

## Key Signals

- Source path: taskmanager/brain/scripts/windows/tools/source-package.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 136
- Tags: brain, brain-scripts, json, neutral, package-manifest, scripts
- JSON keys: bin, description, engines, license, main, name, scripts, type, version

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, package-manifest, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/tools/source-package.json

## Excerpt

~~~json
{
  "name": "windows-js-skill-pack",
  "version": "0.1.0",
  "description": "Searchable Windows action/launcher skill pack for Node/Electron apps.",
  "main": "src/index.js",
  "type": "commonjs",
  "bin": {
    "windows-skill-pack": "src/cli.js"
  },
  "scripts": {
    "list": "node src/cli.js list",
    "search": "node src/cli.js search bluetooth",
    "doctor": "node src/cli.js doctor",
    "build-index": "node src/createIndex.js"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
~~~