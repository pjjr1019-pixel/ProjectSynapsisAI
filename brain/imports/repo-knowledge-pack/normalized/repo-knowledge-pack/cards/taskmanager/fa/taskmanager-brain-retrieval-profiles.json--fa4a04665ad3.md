---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/retrieval/profiles.json"
source_name: "profiles.json"
top_level: "taskmanager"
surface: "brain-retrieval"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 62
selected_rank: 781
content_hash: "1c3fb7005f9a3f3db25c0eaf992a2cb53aff22c7309497b78c7236c3ad6b7d34"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-retrieval"
  - "json"
  - "neutral"
json_keys:
  - "$comment"
  - "defaults"
  - "importLibraryModes"
  - "profiles"
  - "version"
---

# taskmanager/brain/retrieval/profiles.json

> JSON data file; keys $comment, defaults, importLibraryModes, profiles, version

## Key Signals

- Source path: taskmanager/brain/retrieval/profiles.json
- Surface: brain-retrieval
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 62
- Tags: brain, brain-retrieval, json, neutral
- JSON keys: $comment, defaults, importLibraryModes, profiles, version

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-retrieval, json, neutral, taskmanager
- Source link target: taskmanager/brain/retrieval/profiles.json

## Excerpt

~~~json
{
  "$comment": "Filter chunks.jsonl by docId/domain/path. Pick ONE import library: megapack OR individual_packs OR knowledge_v1_v2 OR repo_knowledge_pack and opt into live/bulk explicitly.",
  "version": "1.1",
  "importLibraryModes": {
    "none": "No imports/base-knowledge chunks (canonical + core only).",
    "megapack": "Only hz.pipeline.imports.megapack-all-recommended plus files under HorizonsAI_Brain_MegaPack_AllRecommended/.",
    "individual_packs": "Individual brain zip anchors (v3-v8, knowledge packs) excluding the megapack anchor and paths.",
    "knowledge_v1_v2": "Only Knowledge Pack v1/v2 anchors and paths.",
    "repo_knowledge_pack": "Whole-repo repo knowledge pack imports and file cards.",
    "all": "All legacy import libraries. Live/bulk import families still require explicit opt-in."
  },
  "defaults": {
    "allowDraft": false,
    "minConfidence": 0.5,
    "rrfK": 60,
    "queryExpansion": true,
    "queryDecomposition": false,
    "rerankMode": "heuristic",
    "freshnessBias": 1,
    "notes": "Production keeps draft knowledge off by default. Live/bulk imports remain opt-in by profile."
  },
  "profiles": {
    "assistant-default": {
      "description": "Core + assistant + launcher; megapack as single import library.",
      "importLibrary": "megapack",
      "importFamilies": [
        "megapack"
      ],
~~~