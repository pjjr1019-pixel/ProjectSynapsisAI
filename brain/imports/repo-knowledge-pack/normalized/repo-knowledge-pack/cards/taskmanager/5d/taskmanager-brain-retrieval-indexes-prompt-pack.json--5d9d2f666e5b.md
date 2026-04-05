---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/retrieval/indexes/prompt-pack.json"
source_name: "prompt-pack.json"
top_level: "taskmanager"
surface: "brain-retrieval"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 76
selected_rank: 749
content_hash: "b56cbbb3201e25504068ebbd1621f798e2e731a63c1ed007e6541181dd671fb1"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-retrieval"
  - "index"
  - "json"
  - "neutral"
exports:
  - "requests"
---

# taskmanager/brain/retrieval/indexes/prompt-pack.json

> JSON data file; exports requests

## Key Signals

- Source path: taskmanager/brain/retrieval/indexes/prompt-pack.json
- Surface: brain-retrieval
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 76
- Tags: brain, brain-retrieval, index, json, neutral
- Exports: requests

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-retrieval, index, json, neutral, taskmanager
- Source link target: taskmanager/brain/retrieval/indexes/prompt-pack.json

## Excerpt

~~~json
{
  "artifactType": "prompt-pack",
  "buildVersion": "brain-ir-runtime-v1",
  "builtAt": "2026-03-31T09:46:13.194Z",
  "counts": {
    "docCount": 2627
  },
  "docs": [
    {
      "app": "assistant",
      "docId": "hz.assistant.sample-topic.2026-03-27",
      "domain": "assistant",
      "facts": [
        "This document demonstrates **canonical** assistant knowledge: front matter matches `brain/SCHEMAS/knowledge-document.schema.json`, body is plain Markdown for human readers and chunking."
      ],
      "sourceType": "canonical",
      "summary": "This document demonstrates **canonical** assistant knowledge: front matter matches `brain/SCHEMAS/knowledge-document.schema.json`, body is plain Markdown for human readers and chunking.",
      "title": "Sample canonical knowledge topic"
    },
    {
      "app": "assistant",
      "docId": "hz.auto.apps.assistant.draft.readme.src-md",
      "domain": "assistant",
      "facts": [
        "Work-in-progress knowledge. **Not** loaded for production retrieval unless `allowDraft` is enabled. Promote to `../canonical/` per `brain/_meta/expansion-rules.md`."
      ],
      "sourceType": "draft",
      "summary": "Work-in-progress knowledge. **Not** loaded for production retrieval unless `allowDraft` is enabled. Promote to `../canonical/` per `brain/_meta/expansion-rules.md`.",
~~~