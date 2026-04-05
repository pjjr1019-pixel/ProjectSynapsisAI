---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/generated/runtime/learning/manifests/cycle-2026-03-29T22-01-02-578Z.json"
source_name: "cycle-2026-03-29T22-01-02-578Z.json"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: -52
selected_rank: 4788
content_hash: "b2a49d23c1ee768cb686657d1f76a737b8d813b65e558327837639bbd74b19d5"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "json"
  - "manifest"
  - "neutral"
  - "source"
json_keys:
  - "artifactType"
  - "cycleId"
  - "discoveredCount"
  - "fetchResults"
  - "finishedAt"
  - "idleTrainingEnabled"
  - "processedCount"
  - "promotedPaths"
  - "promotionCount"
  - "promotionMode"
  - "rebuildTriggered"
  - "seedUrls"
  - "sourceScope"
  - "startedAt"
---

# taskmanager/brain/generated/runtime/learning/manifests/cycle-2026-03-29T22-01-02-578Z.json

> JSON data file; keys artifactType, cycleId, discoveredCount, fetchResults, finishedAt, idleTrainingEnabled

## Key Signals

- Source path: taskmanager/brain/generated/runtime/learning/manifests/cycle-2026-03-29T22-01-02-578Z.json
- Surface: source
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: -52
- Tags: brain, json, manifest, neutral, source
- JSON keys: artifactType, cycleId, discoveredCount, fetchResults, finishedAt, idleTrainingEnabled, processedCount, promotedPaths, promotionCount, promotionMode

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, json, manifest, neutral, source, taskmanager
- Source link target: taskmanager/brain/generated/runtime/learning/manifests/cycle-2026-03-29T22-01-02-578Z.json

## Excerpt

~~~json
{
  "artifactType": "idle-training-cycle",
  "cycleId": "cycle-2026-03-29T22-01-02-578Z",
  "discoveredCount": 0,
  "fetchResults": [
    {
      "status": "too_short",
      "url": "https://example.com/a",
      "workerId": 1
    },
    {
      "status": "domain_cooldown",
      "url": "https://example.com/b",
      "workerId": 1
    },
    {
      "status": "too_short",
      "url": "https://other.example.net/c",
      "workerId": 2
    }
  ],
  "finishedAt": "2026-03-29T22:01:02.771Z",
  "idleTrainingEnabled": true,
  "processedCount": 3,
  "promotedPaths": [],
  "promotionCount": 0,
  "promotionMode": "full-auto-promote-broadly",
  "rebuildTriggered": false,
~~~