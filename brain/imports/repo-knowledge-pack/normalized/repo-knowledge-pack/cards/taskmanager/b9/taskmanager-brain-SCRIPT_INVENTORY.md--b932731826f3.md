---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/SCRIPT_INVENTORY.md"
source_name: "SCRIPT_INVENTORY.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4429
content_hash: "bee67f40c1dcab4a0176831b37a82c77c0dc77d2c40a12118cd6e6956fd97939"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
exports:
  - "surface"
headings:
  - "AI Toolkit Modules"
  - "AI Toolkit Pipeline Modules"
  - "Canonical Script Location"
  - "How to Run"
  - "Library"
  - "Output Directory"
  - "Script Inventory"
  - "Scripts"
---

# taskmanager/brain/SCRIPT_INVENTORY.md

> Markdown doc; exports surface; headings AI Toolkit Modules / AI Toolkit Pipeline Modules / Canonical Script Location

## Key Signals

- Source path: taskmanager/brain/SCRIPT_INVENTORY.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: brain, docs, markdown, md, neutral, source
- Exports: surface
- Headings: AI Toolkit Modules | AI Toolkit Pipeline Modules | Canonical Script Location | How to Run | Library | Output Directory

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/brain/SCRIPT_INVENTORY.md

## Excerpt

~~~markdown
# Script Inventory

Generated: 2026-04-01

This document inventories all analysis/tooling scripts in the repository and their canonical locations after migration.

---

## Canonical Script Location

All scripts live at: `taskmanager/brain/scripts/repo-tools/`

The library dependency lives at: `taskmanager/brain/scripts/lib/common.js`

A `package.json` at `taskmanager/brain/scripts/package.json` declares `"type": "commonjs"` so these scripts run as CJS within the ESM `taskmanager/` package.

---

## Scripts

| Script | Description | Dependencies |
|--------|-------------|--------------|
| `00-run-baseline.js` | Entry point — runs scripts 01–04 in sequence to produce baseline repo reports | `../lib/common`, child scripts 01–04 |
| `01-generate-focus-map.js` | Generates `.ai_repo/focus-map.md` — ranked list of files most relevant for AI context | `../lib/common` |
| `02-generate-heavy-path-report.js` | Generates `.ai_repo/heavy-paths.md` — largest directories and files by size | `../lib/common` |
| `03-generate-duplicate-name-report.js` | Generates `.ai_repo/duplicate-name-report.md` — files sharing the same basename | `../lib/common` |
| `04-generate-import-hubs.js` | Generates `.ai_repo/import-hubs.md` — most-imported modules (dependency hubs) | `../lib/common` |
| `05-generate-task-brief.js` | Generates a focused context pack for a given `--task` description | `../lib/common` |
~~~