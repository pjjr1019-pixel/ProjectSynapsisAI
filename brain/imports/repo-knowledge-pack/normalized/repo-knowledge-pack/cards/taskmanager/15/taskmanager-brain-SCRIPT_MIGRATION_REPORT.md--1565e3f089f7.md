---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/SCRIPT_MIGRATION_REPORT.md"
source_name: "SCRIPT_MIGRATION_REPORT.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 20
selected_rank: 4007
content_hash: "f61b0fe1170d77de20531226109e3a452234f92d81b9c7b6dda1097fc27c424c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
imports:
  - "taskmanager/brain/scripts/lib/common.js"
headings:
  - "Compatibility Stubs Created"
  - "Files Updated (Path/Reference Changes)"
  - "Library Files Moved"
  - "New Infrastructure Files"
  - "Script Migration Report"
  - "Scripts Moved"
  - "Summary"
  - "Validation Results"
---

# taskmanager/brain/SCRIPT_MIGRATION_REPORT.md

> Markdown doc; imports taskmanager/brain/scripts/lib/common.js; headings Compatibility Stubs Created / Files Updated (Path/Reference Changes) / Library Files Moved

## Key Signals

- Source path: taskmanager/brain/SCRIPT_MIGRATION_REPORT.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 20
- Tags: brain, docs, markdown, md, neutral, source
- Imports: taskmanager/brain/scripts/lib/common.js
- Headings: Compatibility Stubs Created | Files Updated (Path/Reference Changes) | Library Files Moved | New Infrastructure Files | Script Migration Report | Scripts Moved

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/SCRIPT_MIGRATION_REPORT.md

## Excerpt

~~~markdown
# Script Migration Report

Date: 2026-04-01
Migration: `taskmanager/scripts/` + `taskmanager/lib/` → `taskmanager/brain/scripts/`

---

## Summary

| Category | Count |
|----------|-------|
| Scripts moved to new canonical location | 11 |
| Library files moved | 1 |
| Config files moved (unchanged) | 0 — config already at `taskmanager/config/` |
| Files updated (path/reference changes) | 4 |
| Compatibility stubs created | 3 |
| New infrastructure files created | 1 (`package.json` CJS island) |
| Validation checks run | 3 |
| Validation pass/fail | 3 / 0 |

---

## Scripts Moved

All scripts copied from `taskmanager/scripts/` and one from `scripts/` (repo root) to `taskmanager/brain/scripts/repo-tools/`:

| File | Source | Destination | Changes |
|------|--------|-------------|---------|
~~~