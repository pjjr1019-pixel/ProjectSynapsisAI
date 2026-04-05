---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/core/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-core"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 122
selected_rank: 18
content_hash: "63697297eb34324c11054536d351c741450811e2dc65cd3786f4f0c05f9cba5c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-core"
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
headings:
  - "brain/core"
  - "Caution"
  - "Key Files"
  - "Purpose"
  - "Safe to Edit"
  - "Usage"
---

# taskmanager/brain/core/README.md

> Markdown doc; headings brain/core / Caution / Key Files

## Key Signals

- Source path: taskmanager/brain/core/README.md
- Surface: brain-core
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-core, docs, high-value, markdown, md
- Headings: brain/core | Caution | Key Files | Purpose | Safe to Edit | Usage

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-core, docs, high-value, markdown, md, taskmanager
- Source link target: taskmanager/brain/core/README.md

## Excerpt

~~~markdown
# brain/core

## Purpose
Holds shared contracts, safety defaults, and policy-level knowledge for all Horizons AI surfaces and retrieval.

## Key Files
- retrieval-contract.md — retrieval contract and policy
- safety-defaults.md — safety and governance defaults
- system-prompt-baseline.md — baseline system prompts
- tool-contracts.md — tool and integration contracts

## Usage
- Always loaded for production retrieval and core system behavior
- Referenced by module registry and retrieval profiles

## Safe to Edit
- All files in core/ (except those marked as generated)

## Caution
- Do not move or rename files without updating references in manifests and module registry

See also: CODEBASE_MASTER_SUMMARY.md, AI_GUIDE.md, retrieval-contract.md
~~~