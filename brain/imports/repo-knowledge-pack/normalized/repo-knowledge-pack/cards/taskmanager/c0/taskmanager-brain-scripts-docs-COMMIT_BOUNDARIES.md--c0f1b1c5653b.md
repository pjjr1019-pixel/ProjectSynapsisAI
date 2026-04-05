---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/docs/COMMIT_BOUNDARIES.md"
source_name: "COMMIT_BOUNDARIES.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 108
selected_rank: 477
content_hash: "c7ccf65d02e489d956f15e79a09e9b634c88b15cf97c48c3fc0b345f57274f3b"
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
  - "Boundary 1: Specialist Pipeline"
  - "Boundary 2: Active Scripts Runtime and Bridge"
  - "Boundary 3: Staging Packs (Vendor/Import Snapshot)"
  - "Boundary 4: Runtime Artifacts (Optional, Usually Exclude)"
  - "Commit Boundaries"
  - "Suggested Commit Order"
---

# taskmanager/brain/scripts/docs/COMMIT_BOUNDARIES.md

> Script surface; headings Boundary 1: Specialist Pipeline / Boundary 2: Active Scripts Runtime and Bridge / Boundary 3: Staging Packs (Vendor/Import Snapshot)

## Key Signals

- Source path: taskmanager/brain/scripts/docs/COMMIT_BOUNDARIES.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: Boundary 1: Specialist Pipeline | Boundary 2: Active Scripts Runtime and Bridge | Boundary 3: Staging Packs (Vendor/Import Snapshot) | Boundary 4: Runtime Artifacts (Optional, Usually Exclude) | Commit Boundaries | Suggested Commit Order

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/docs/COMMIT_BOUNDARIES.md

## Excerpt

~~~markdown
# Commit Boundaries

Generated: 2026-04-01

This plan separates high-signal product code from volatile generated/runtime artifacts.

## Boundary 1: Specialist Pipeline

Purpose: specialist model pipeline implementation and tests.

Include:

- `server/dev-api.mjs`
- `src/components/developer-mode/DeveloperModeWorkspace.tsx`
- `portable_lib/specialist/**`
- `tests/specialist/**`
- `brain/scripts/registry/script_manifest.schema.json`
- `package.json` (only specialist script entries)

Exclude:

- runtime snapshots/logs/state files
- `_staging` pack contents

## Boundary 2: Active Scripts Runtime and Bridge

Purpose: active scripts runner evolution and incremental staged-pack promotion.
~~~