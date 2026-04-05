---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/retrieval/indexes/drift-report.json"
source_name: "drift-report.json"
top_level: "taskmanager"
surface: "brain-retrieval"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 82
selected_rank: 634
content_hash: "585678e45e15799121d69dbeeea648a94bd094511e92c12a19b6c9021e556230"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-retrieval"
  - "index"
  - "json"
  - "neutral"
---

# taskmanager/brain/retrieval/indexes/drift-report.json

> JSON data file

## Key Signals

- Source path: taskmanager/brain/retrieval/indexes/drift-report.json
- Surface: brain-retrieval
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 82
- Tags: brain, brain-retrieval, index, json, neutral

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-retrieval, index, json, neutral, taskmanager
- Source link target: taskmanager/brain/retrieval/indexes/drift-report.json

## Excerpt

~~~json
{
  "artifactType": "brain-drift-report",
  "buildVersion": "brain-ir-runtime-v1",
  "builtAt": "2026-03-30T06:15:26.167Z",
  "counts": {
    "high": 24,
    "issueCount": 39,
    "low": 2,
    "medium": 13
  },
  "issues": [
    {
      "affectedDocs": [
        "hz.auto.runtime.sessions.snapshots.session-196011f5-a057-48ad-8c60-59e4610db374.src-json",
        "hz.runtime.session.196011f5-a057-48ad-8c60-59e4610db374"
      ],
      "code": "alias_collision",
      "message": "Alias \"session 196011f5 a057 48ad 8c60 59e4610db374\" resolves to multiple canonicals.",
      "severity": "medium"
    },
    {
      "affectedDocs": [
        "hz.auto.runtime.sessions.snapshots.session-2430f6f2-91ec-496b-a3d6-ba7d6f13d767.src-json",
        "hz.runtime.session.2430f6f2-91ec-496b-a3d6-ba7d6f13d767"
      ],
      "code": "alias_collision",
      "message": "Alias \"session 2430f6f2 91ec 496b a3d6 ba7d6f13d767\" resolves to multiple canonicals.",
      "severity": "medium"
~~~