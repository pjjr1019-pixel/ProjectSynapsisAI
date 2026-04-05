---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/core/retrieval-contract.md"
source_name: "retrieval-contract.md"
top_level: "taskmanager"
surface: "brain-core"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 112
selected_rank: 118
content_hash: "88e3e62a6f1e2ed40ad30a6f24118103eb3ebde53f84771df3bcf2c428480630"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-core"
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
headings:
  - "Inputs"
  - "Outputs"
  - "Profiles"
  - "Retrieval contract"
  - "Rules"
---

# taskmanager/brain/core/retrieval-contract.md

> Markdown doc; headings Inputs / Outputs / Profiles

## Key Signals

- Source path: taskmanager/brain/core/retrieval-contract.md
- Surface: brain-core
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-core, docs, high-value, markdown, md
- Headings: Inputs | Outputs | Profiles | Retrieval contract | Rules

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-core, docs, high-value, markdown, md, taskmanager
- Source link target: taskmanager/brain/core/retrieval-contract.md

## Excerpt

~~~markdown
---
id: hz.core.retrieval-contract.2026-03-27
title: "Retrieval contract"
domain: core
app: core
kind: policy
status: canonical
confidence: 0.95
provenance:
  sourceType: internal
  sourceId: brain/MANIFEST.yaml
  ingestedAt: "2026-03-27T12:00:00Z"
  verifiedBy: platform-seed
tags:
  - retrieval
  - rag
visibility: system
reviewedAt: "2026-03-27T12:00:00Z"
---

# Retrieval contract

## Inputs

- `retrievalProfile`: string (e.g. `repo-knowledge-pack`) from `MANIFEST.yaml` surfaces.
- `docIds` / chunk filters: optional; must respect `visibility` and `status` (default: `canonical` only in production).

## Outputs
~~~