---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/core/recommended-local-llm-models.json"
source_name: "recommended-local-llm-models.json"
top_level: "taskmanager"
surface: "brain-core"
classification: "high-value"
kind: "json"
language: "json"
extension: ".json"
score: 104
selected_rank: 548
content_hash: "5b35218d811483ecbe16f14945aeb94bc5e62c89fcd5814728e4aba8505f154d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-core"
  - "high-value"
  - "json"
json_keys:
  - "description"
  - "lastReviewed"
  - "models"
  - "version"
---

# taskmanager/brain/core/recommended-local-llm-models.json

> JSON data file; keys description, lastReviewed, models, version

## Key Signals

- Source path: taskmanager/brain/core/recommended-local-llm-models.json
- Surface: brain-core
- Classification: high-value
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 104
- Tags: brain, brain-core, high-value, json
- JSON keys: description, lastReviewed, models, version

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-core, high-value, json, taskmanager
- Source link target: taskmanager/brain/core/recommended-local-llm-models.json

## Excerpt

~~~json
{
  "version": 1,
  "description": "Optional machine-readable hints; names are examples and drift with upstream releases.",
  "lastReviewed": "2026-03-28",
  "models": [
    {
      "id": "example-small-instruct",
      "ollamaModel": "llama3.2",
      "roles": ["refine", "fallback"],
      "minRamGbApprox": 8,
      "notes": "Small instruct variant; replace with exact tag from `ollama pull` / `ollama list`."
    },
    {
      "id": "example-mistral-small",
      "ollamaModel": "mistral",
      "roles": ["fallback", "general"],
      "minRamGbApprox": 8,
      "notes": "7B-class; heavier than tiny models — use when refine quality needs a bump."
    },
    {
      "id": "example-phi-mini",
      "ollamaModel": "phi3",
      "roles": ["refine", "fallback"],
      "minRamGbApprox": 4,
      "notes": "Often used for lightweight local inference; verify current Ollama tag."
    }
  ]
}
~~~