---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/package.json"
source_name: "package.json"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "package-json"
language: "json"
extension: ".json"
score: 83
selected_rank: 631
content_hash: "65f53fbcd6e2a422b3d8b219a6a18e73c8655b496ec7c1084b778c04fb6bb055"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "json"
  - "neutral"
  - "package-json"
  - "package-manifest"
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
package_name: "windows-js-skill-pack"
package_scripts:
  - "build-index"
  - "doctor"
  - "list"
  - "search"
---

# taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/package.json

> Package manifest; keys bin, description, engines, license, main, name; scripts build-index, doctor, list, search

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/package.json
- Surface: brain-imports
- Classification: neutral
- Kind: package-json
- Language: json
- Top level: taskmanager
- Score: 83
- Tags: brain, brain-imports, json, neutral, package-json, package-manifest
- JSON keys: bin, description, engines, license, main, name, scripts, type, version
- Package scripts: build-index, doctor, list, search

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, json, neutral, package-json, package-manifest, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/package.json

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