---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/core/tool-contracts.md"
source_name: "tool-contracts.md"
top_level: "taskmanager"
surface: "brain-core"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 106
selected_rank: 541
content_hash: "ebe46d862c15d3a7fb93a8873d523afb78df525ca19566c66ae6634b0c6a8279"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-core"
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
headings:
  - "Extensibility"
  - "General"
  - "Tool contracts (shared)"
---

# taskmanager/brain/core/tool-contracts.md

> Markdown doc; headings Extensibility / General / Tool contracts (shared)

## Key Signals

- Source path: taskmanager/brain/core/tool-contracts.md
- Surface: brain-core
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 106
- Tags: brain, brain-core, docs, high-value, markdown, md
- Headings: Extensibility | General | Tool contracts (shared)

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-core, docs, high-value, markdown, md, taskmanager
- Source link target: taskmanager/brain/core/tool-contracts.md

## Excerpt

~~~markdown
# Tool contracts (shared)

Define how tools are invoked and what the model may assume.

## General

- Tools may return errors; the model must surface failures without inventing success.
- Destructive or high-impact actions require explicit user confirmation per product policy (see `brain/governance/policies/default-policy.md`).
- Log references: use `traceId` from runtime when describing “what ran,” never paste secrets.

## Extensibility

Per-app tools register in code; knowledge here documents **behavioral** expectations only. Update this file when adding a new tool family so retrieval stays consistent.
~~~