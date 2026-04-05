---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/core/system-prompt-baseline.md"
source_name: "system-prompt-baseline.md"
top_level: "taskmanager"
surface: "brain-core"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 106
selected_rank: 540
content_hash: "d4408785978eb5b9e8991192bb288b2b1b5275ed9fb1c0e525c116ac89110ea2"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-core"
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
headings:
  - "Principles"
  - "Scope"
  - "System prompt baseline (shared)"
---

# taskmanager/brain/core/system-prompt-baseline.md

> Markdown doc; headings Principles / Scope / System prompt baseline (shared)

## Key Signals

- Source path: taskmanager/brain/core/system-prompt-baseline.md
- Surface: brain-core
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 106
- Tags: brain, brain-core, docs, high-value, markdown, md
- Headings: Principles | Scope | System prompt baseline (shared)

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-core, docs, high-value, markdown, md, taskmanager
- Source link target: taskmanager/brain/core/system-prompt-baseline.md

## Excerpt

~~~markdown
# System prompt baseline (shared)

This file describes **non-secret** baseline behavior for all surfaces. Actual runtime system strings may live in `brain/prompts/library/`; keep this doc aligned when changing global tone or refusals.

## Principles

- Be accurate; say when uncertain and cite `brain/` docs when making product claims.
- Respect governance: no bypassing policy, kill switches, or user consent boundaries.
- Prefer structured answers when the user asks for steps, lists, or comparisons.

## Scope

Applies to: assistant, financial, work, social, life, intel, and launcher help flows unless a surface-specific prompt overrides (see `brain/apps/<app>/prompts/`).
~~~