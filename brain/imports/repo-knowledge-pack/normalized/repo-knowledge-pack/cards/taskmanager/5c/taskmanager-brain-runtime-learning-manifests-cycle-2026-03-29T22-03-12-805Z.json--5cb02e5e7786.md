---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T22-03-12-805Z.json"
source_name: "cycle-2026-03-29T22-03-12-805Z.json"
top_level: "taskmanager"
surface: "runtime"
classification: "generated"
kind: "json"
language: "json"
extension: ".json"
score: -68
selected_rank: 3670
content_hash: "6c2572b6627f8b9e6bbb206ed291b4154b15235814d0944f056b2945626c79e5"
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

# taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T22-03-12-805Z.json

> JSON data file; keys artifactType, cycleId, discoveredCount, fetchResults, finishedAt, idleTrainingEnabled

## Key Signals

- Source path: taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T22-03-12-805Z.json
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
- Source link target: taskmanager/brain/runtime/learning/manifests/cycle-2026-03-29T22-03-12-805Z.json

## Excerpt

~~~json
{
  "artifactType": "idle-training-cycle",
  "cycleId": "cycle-2026-03-29T22-03-12-805Z",
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
  "finishedAt": "2026-03-29T22:03:12.967Z",
  "idleTrainingEnabled": true,
  "processedCount": 3,
  "promotedPaths": [],
  "promotionCount": 0,
  "promotionMode": "full-auto-promote-broadly",
  "rebuildTriggered": false,
~~~