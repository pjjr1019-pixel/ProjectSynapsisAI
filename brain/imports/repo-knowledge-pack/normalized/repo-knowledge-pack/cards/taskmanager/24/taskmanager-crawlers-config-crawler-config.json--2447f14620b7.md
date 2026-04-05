---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/crawlers/config/crawler-config.json"
source_name: "crawler-config.json"
top_level: "taskmanager"
surface: "source"
classification: "high-value"
kind: "json"
language: "json"
extension: ".json"
score: 48
selected_rank: 3954
content_hash: "3dd1da62b20308f3d05f4196ae038c56d7dd59ab296898dadb4ae67779cfb432"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "config"
  - "high-value"
  - "json"
  - "source"
json_keys:
  - "_comment"
  - "enabled"
  - "idleTraining"
  - "rateLimit"
  - "sources"
  - "storage"
---

# taskmanager/crawlers/config/crawler-config.json

> JSON data file; keys _comment, enabled, idleTraining, rateLimit, sources, storage

## Key Signals

- Source path: taskmanager/crawlers/config/crawler-config.json
- Surface: source
- Classification: high-value
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 48
- Tags: config, high-value, json, source
- JSON keys: _comment, enabled, idleTraining, rateLimit, sources, storage

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: config, high-value, json, source, taskmanager
- Source link target: taskmanager/crawlers/config/crawler-config.json

## Excerpt

~~~json
{
  "_comment": "Local crawler configuration for the standalone taskmanager. Edit as needed.",
  "enabled": true,
  "idleTraining": {
    "autostart": false,
    "pollingIntervalMs": 60000,
    "maxConcurrentFetches": 2,
    "politenessDelayMs": 1500,
    "maxQueueDepth": 50
  },
  "rateLimit": {
    "requestsPerMinutePerHost": 10,
    "globalRequestsPerMinute": 30
  },
  "storage": {
    "runtimeDir": "../runtime",
    "maxLogFileSizeBytes": 1048576,
    "historyRetentionDays": 7
  },
  "sources": []
}
~~~