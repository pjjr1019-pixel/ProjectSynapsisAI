---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T23-55-04-883Z.json"
source_name: "cycle-2026-03-29T23-55-04-883Z.json"
top_level: "taskmanager"
surface: "runtime"
classification: "generated"
kind: "json"
language: "json"
extension: ".json"
score: -68
selected_rank: 3921
content_hash: "82f76384ac65e46a20030df9459aa68c00f5bc2951744f6c332221fc606f56a4"
generated_at: "2026-04-02T14:59:03.985Z"
tags:
  - "brain"
  - "generated"
  - "json"
  - "manifest"
  - "runtime"
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

# taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T23-55-04-883Z.json

> JSON data file; keys artifactType, cycleId, discoveredCount, fetchResults, finishedAt, idleTrainingEnabled

## Key Signals

- Source path: taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T23-55-04-883Z.json
- Surface: runtime
- Classification: generated
- Kind: json
- Language: json
- Top level: taskmanager
- Score: -68
- Tags: brain, generated, json, manifest, runtime
- JSON keys: artifactType, cycleId, discoveredCount, fetchResults, finishedAt, idleTrainingEnabled, processedCount, promotedPaths, promotionCount, promotionMode

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, generated, json, manifest, runtime, taskmanager
- Source link target: taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T23-55-04-883Z.json

## Excerpt

~~~json
{
  "artifactType": "idle-training-cycle",
  "cycleId": "cycle-2026-03-29T23-55-04-883Z",
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
  "finishedAt": "2026-03-29T23:55:05.013Z",
  "idleTrainingEnabled": true,
  "processedCount": 3,
  "promotedPaths": [],
  "promotionCount": 0,
  "promotionMode": "full-auto-promote-broadly",
  "rebuildTriggered": false,
~~~