---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/config/horizons-ai.defaults.json"
source_name: "horizons-ai.defaults.json"
top_level: "taskmanager"
surface: "config"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 32
selected_rank: 3387
content_hash: "0c3218032b885cbe383ed3212668a9bc1f58c353a139b840f8983d2d585fdc0c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "config"
  - "json"
  - "neutral"
json_keys:
  - "contextPack"
  - "defaultTaskReadOrder"
  - "docPrefixes"
  - "generatedPrefixes"
  - "highValuePrefixes"
  - "lowValuePrefixes"
  - "notes"
  - "priorityGlobs"
  - "repoName"
  - "reports"
---

# taskmanager/config/horizons-ai.defaults.json

> JSON data file; keys contextPack, defaultTaskReadOrder, docPrefixes, generatedPrefixes, highValuePrefixes, lowValuePrefixes

## Key Signals

- Source path: taskmanager/config/horizons-ai.defaults.json
- Surface: config
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 32
- Tags: config, json, neutral
- JSON keys: contextPack, defaultTaskReadOrder, docPrefixes, generatedPrefixes, highValuePrefixes, lowValuePrefixes, notes, priorityGlobs, repoName, reports

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: config, json, neutral, taskmanager
- Source link target: taskmanager/config/horizons-ai.defaults.json

## Excerpt

~~~json
{
  "repoName": "Horizons.AI taskmanager token saver defaults",
  "notes": [
    "These defaults are tailored from the uploaded repo map.",
    "They intentionally boost taskmanager/src, server, shared, desktop, portable_lib, crawlers, and brain/core.",
    "They intentionally de-prioritize huge generated/runtime/index zones that consume tokens but are rarely the right first read."
  ],
  "highValuePrefixes": [
    "taskmanager/src/",
    "taskmanager/server/",
    "taskmanager/shared/",
    "taskmanager/desktop/",
    "taskmanager/portable_lib/",
    "taskmanager/crawlers/",
    "taskmanager/brain/core/",
    "taskmanager/package.json",
    "taskmanager/package-lock.json",
    "taskmanager/README.md",
    "taskmanager/READ_FIRST.md",
    "taskmanager/DEPENDENCY_AUDIT.md",
    "taskmanager/PORTABILITY_"
  ],
  "docPrefixes": [
    "taskmanager/README.md",
    "taskmanager/READ_FIRST.md",
    "taskmanager/DEPENDENCY_AUDIT.md",
    "taskmanager/PORTABILITY_",
    "taskmanager/crawlers/README.md",
~~~