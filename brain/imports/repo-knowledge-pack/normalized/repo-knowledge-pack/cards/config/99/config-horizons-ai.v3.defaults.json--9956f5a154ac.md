---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "config/horizons-ai.v3.defaults.json"
source_name: "horizons-ai.v3.defaults.json"
top_level: "config"
surface: "source"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 12
selected_rank: 4439
content_hash: "5400324c33ad8d55c920373e835dc6b1ade3a970f56e26ce7be810f56e593007"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "config"
  - "json"
  - "neutral"
  - "source"
json_keys:
  - "contextPack"
  - "docPrefixes"
  - "generatedPrefixes"
  - "highValuePrefixes"
  - "lowValuePrefixes"
  - "notes"
  - "repoName"
  - "reports"
  - "rootManifestSignals"
---

# config/horizons-ai.v3.defaults.json

> JSON data file; keys contextPack, docPrefixes, generatedPrefixes, highValuePrefixes, lowValuePrefixes, notes

## Key Signals

- Source path: config/horizons-ai.v3.defaults.json
- Surface: source
- Classification: neutral
- Kind: json
- Language: json
- Top level: config
- Score: 12
- Tags: config, json, neutral, source
- JSON keys: contextPack, docPrefixes, generatedPrefixes, highValuePrefixes, lowValuePrefixes, notes, repoName, reports, rootManifestSignals

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: config, json, neutral, source
- Source link target: config/horizons-ai.v3.defaults.json

## Excerpt

~~~json
{
  "repoName": "Horizons.AI taskmanager token saver defaults v3",
  "notes": [
    "This v3 pack is tuned from the uploaded repo map plus uploaded package and lockfile evidence.",
    "It biases toward real app manifests and away from dependency package.json files inside node_modules or vendored trees.",
    "It is specifically tuned for a likely Horizons taskmanager stack built around Electron, React, Vite, TypeScript, LanceDB, and local AI/model runtime dependencies."
  ],
  "highValuePrefixes": [
    "taskmanager/src/",
    "taskmanager/server/",
    "taskmanager/shared/",
    "taskmanager/desktop/",
    "taskmanager/portable_lib/",
    "taskmanager/crawlers/",
    "taskmanager/webcrawler/",
    "taskmanager/brain/core/",
    "taskmanager/brain/apps/",
    "taskmanager/package.json",
    "taskmanager/package-lock.json",
    "taskmanager/package.standalone.json",
    "taskmanager/README.md",
    "taskmanager/READ_FIRST.md",
    "taskmanager/DEPENDENCY_AUDIT.md",
    "taskmanager/STANDALONE_",
    "taskmanager/PORTABILITY_",
    "taskmanager/vite.config",
    "taskmanager/electron",
    "scripts/"
~~~