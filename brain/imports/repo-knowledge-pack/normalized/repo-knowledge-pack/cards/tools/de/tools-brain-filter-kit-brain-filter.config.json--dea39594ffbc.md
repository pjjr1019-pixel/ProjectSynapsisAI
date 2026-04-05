---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/brain-filter.config.json"
source_name: "brain-filter.config.json"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 24
selected_rank: 3395
content_hash: "2ea88e99ea63fed05ca1ada9d5904ee2d5229728cab3a482d2e4ae47154d5f1b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "config"
  - "json"
  - "neutral"
  - "tools"
json_keys:
  - "approvedDir"
  - "badPatterns"
  - "dedupedFile"
  - "hardBlockPatterns"
  - "ignoreDirs"
  - "manifestFile"
  - "maxSoftBytes"
  - "minBytes"
  - "outputDir"
  - "prioritySourceTypes"
  - "quarantineDir"
  - "reportFile"
  - "rootDir"
  - "scoredFile"
  - "sourceTypeRules"
---

# tools/brain-filter-kit/brain-filter.config.json

> JSON data file; keys approvedDir, badPatterns, dedupedFile, hardBlockPatterns, ignoreDirs, manifestFile

## Key Signals

- Source path: tools/brain-filter-kit/brain-filter.config.json
- Surface: tools
- Classification: neutral
- Kind: json
- Language: json
- Top level: tools
- Score: 24
- Tags: brain, config, json, neutral, tools
- JSON keys: approvedDir, badPatterns, dedupedFile, hardBlockPatterns, ignoreDirs, manifestFile, maxSoftBytes, minBytes, outputDir, prioritySourceTypes

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, config, json, neutral, tools
- Source link target: tools/brain-filter-kit/brain-filter.config.json

## Excerpt

~~~json
{
  "rootDir": "brain",
  "outputDir": "brain_runtime_filter",
  "manifestFile": "brain_manifest.jsonl",
  "scoredFile": "brain_scored.jsonl",
  "dedupedFile": "brain_deduped.jsonl",
  "reportFile": "brain_report.json",
  "approvedDir": "approved_corpus",
  "quarantineDir": "quarantine_candidates",
  "minBytes": 80,
  "maxSoftBytes": 2000000,
  "topDocsDefault": 50,
  "textExtensions": [
    ".txt", ".md", ".markdown", ".json", ".jsonl", ".yaml", ".yml",
    ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".java",
    ".c", ".cpp", ".h", ".hpp", ".rs", ".go", ".html", ".css",
    ".scss", ".xml", ".csv", ".ini", ".cfg"
  ],
  "ignoreDirs": [
    ".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo",
    ".cache", "tmp", "temp", "logs", ".venv", "venv", "__pycache__"
  ],
  "hardBlockPatterns": [
    "/retrieval/indexes/",
    "/knowledge/build/",
    "/node_modules/",
    "/dist/",
    "/build/",
~~~