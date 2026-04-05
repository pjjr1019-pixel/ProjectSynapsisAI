---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "RepoMAP/REPO_MAP_README.md"
source_name: "REPO_MAP_README.md"
top_level: "RepoMAP"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 34
selected_rank: 3960
content_hash: "d0f8f4a8b45070d9ceb53dc29161048781f3d9333eef162d05da3ce8ea8826dd"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "How to Regenerate"
  - "Output File Details"
  - "Repo Map System"
  - "REPO_MAP_FULL.json"
  - "REPO_MAP_FULL.md"
  - "REPO_MAP_FULL.txt"
  - "Stats at Last Generation"
  - "What Was Generated"
---

# RepoMAP/REPO_MAP_README.md

> Markdown doc; headings How to Regenerate / Output File Details / Repo Map System

## Key Signals

- Source path: RepoMAP/REPO_MAP_README.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: RepoMAP
- Score: 34
- Tags: docs, markdown, md, neutral, source
- Headings: How to Regenerate | Output File Details | Repo Map System | REPO_MAP_FULL.json | REPO_MAP_FULL.md | REPO_MAP_FULL.txt

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, RepoMAP, source
- Source link target: RepoMAP/REPO_MAP_README.md

## Excerpt

~~~markdown
# Repo Map System

## What Was Generated

A complete filesystem inventory of the repository was generated on 2026-04-01T05:29:51.659Z.

| Output | Description |
|---|---|
| `REPO_MAP_FULL.md` | Full directory tree in Markdown with metadata header |
| `REPO_MAP_FULL.txt` | Full directory tree in plain text (no Markdown) |
| `REPO_MAP_FULL.json` | Machine-readable nested JSON tree — every node has `name`, `path`, `type`, `children` |
| `REPO_FILE_MANIFEST.csv` | One row per file/folder: `path, name, type, parent, extension, depth` |
| `REPO_MAP_INDEX.md` | Index page linking per-folder chunk files |
| `repo_map_chunks/` | Per-top-level-folder Markdown tree files (generated when tree is large) |
| `REPO_MAP_README.md` | This file |

### Stats at Last Generation

- Repo root: `C:\Users\Pgiov\OneDrive\Documents\Custom programs\Horizons.AI`
- Total folders: **1111**
- Total files: **33204**
- Unreadable paths: **0**

## How to Regenerate

Run from the repo root:

```bash
~~~