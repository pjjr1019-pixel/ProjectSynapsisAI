---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/retrieval/indexes/SOURCE.yaml"
source_name: "SOURCE.yaml"
top_level: "taskmanager"
surface: "brain-retrieval"
classification: "neutral"
kind: "text"
language: "yaml"
extension: ".yaml"
score: 74
selected_rank: 753
content_hash: "6b1f5941a11e5b3101ab1270bcbe1304c0437e92f29774a701d7e2e21430c62c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-retrieval"
  - "index"
  - "neutral"
  - "text"
  - "yaml"
headings:
  - "Invariants: Update with any retrieval, structure, or build change; always validate after edit"
  - "Purpose: Source mapping and regeneration commands for brain/retrieval/indexes/"
  - "Responsibility: Document which files are derived, their authoritative source, and how to regenerate"
  - "Why: Enables reliable, traceable regeneration and prevents accidental edits"
---

# taskmanager/brain/retrieval/indexes/SOURCE.yaml

> Text asset; headings Invariants: Update with any retrieval, structure, or build change; always validate after edit / Purpose: Source mapping and regeneration commands for brain/retrieval/indexes/ / Responsibility: Document which files are derived, their authoritative source, and how to regenerate

## Key Signals

- Source path: taskmanager/brain/retrieval/indexes/SOURCE.yaml
- Surface: brain-retrieval
- Classification: neutral
- Kind: text
- Language: yaml
- Top level: taskmanager
- Score: 74
- Tags: brain, brain-retrieval, index, neutral, text, yaml
- Headings: Invariants: Update with any retrieval, structure, or build change; always validate after edit | Purpose: Source mapping and regeneration commands for brain/retrieval/indexes/ | Responsibility: Document which files are derived, their authoritative source, and how to regenerate | Why: Enables reliable, traceable regeneration and prevents accidental edits

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-retrieval, index, neutral, taskmanager, text, yaml
- Source link target: taskmanager/brain/retrieval/indexes/SOURCE.yaml

## Excerpt

~~~yaml
# Purpose: Source mapping and regeneration commands for brain/retrieval/indexes/
# Responsibility: Document which files are derived, their authoritative source, and how to regenerate
# Invariants: Update with any retrieval, structure, or build change; always validate after edit
# Why: Enables reliable, traceable regeneration and prevents accidental edits

brain/retrieval/indexes/:
  generated-by: scripts/build-brain-ir.mjs
  authoritative-source: brain/
  regenerate-command: npm run build-brain-ir
  do-not-edit: true
~~~