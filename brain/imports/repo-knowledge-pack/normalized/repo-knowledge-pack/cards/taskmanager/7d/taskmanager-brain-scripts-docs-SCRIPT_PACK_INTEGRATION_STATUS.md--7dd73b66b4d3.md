---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/docs/SCRIPT_PACK_INTEGRATION_STATUS.md"
source_name: "SCRIPT_PACK_INTEGRATION_STATUS.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 108
selected_rank: 478
content_hash: "a546160d0df651da9f5f3b0a569998e2aec2a52843f61d85b9b26d04caa9733b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "scripts"
headings:
  - "1) Incremental Promotion (Active Runtime)"
  - "2) Isolation Policy (Staged Packs)"
  - "3) Commit Boundary Plan"
  - "4) Repo Knowledge Pack"
  - "Quick Verification Commands"
  - "Scope Completed"
  - "Script Pack Integration Status"
---

# taskmanager/brain/scripts/docs/SCRIPT_PACK_INTEGRATION_STATUS.md

> Script surface; headings 1) Incremental Promotion (Active Runtime) / 2) Isolation Policy (Staged Packs) / 3) Commit Boundary Plan

## Key Signals

- Source path: taskmanager/brain/scripts/docs/SCRIPT_PACK_INTEGRATION_STATUS.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: 1) Incremental Promotion (Active Runtime) | 2) Isolation Policy (Staged Packs) | 3) Commit Boundary Plan | 4) Repo Knowledge Pack | Quick Verification Commands | Scope Completed

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/docs/SCRIPT_PACK_INTEGRATION_STATUS.md

## Excerpt

~~~markdown
# Script Pack Integration Status

Generated: 2026-04-01

## Scope Completed

This workspace now includes all three requested tracks:

1. Incremental promotion into active runtime.
2. Isolation and optional use of staged runners.
3. Commit-boundary preparation for clean history.

## 1) Incremental Promotion (Active Runtime)

A safe external bridge was added to the active runtime so selected staged-pack tools can be invoked from the main runner without replacing the current handler architecture.

Promoted tool ids:

- guarded_list_processes_ext
- guarded_list_listening_ports_ext
- guarded_list_services_ext
- repo_registry_search_ext
- repo_likely_entrypoints_ext
- repo_generate_low_token_pack_ext

Implementation locations:

- core bridge and handlers: `brain/scripts/core/runtime.js`
~~~