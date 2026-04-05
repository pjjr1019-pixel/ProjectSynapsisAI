---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/.ai_repo/heavy-paths.md"
source_name: "heavy-paths.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4364
content_hash: "adce7e09fd6874e6ab857c4b7ad5ac6f1113e019216fd44f3e69511d3646702f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "Heavy Path Report"
  - "Suggested default excludes"
  - "When to override the excludes"
---

# taskmanager/.ai_repo/heavy-paths.md

> Markdown doc; headings Heavy Path Report / Suggested default excludes / When to override the excludes

## Key Signals

- Source path: taskmanager/.ai_repo/heavy-paths.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 14
- Tags: docs, markdown, md, neutral, source
- Headings: Heavy Path Report | Suggested default excludes | When to override the excludes

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/.ai_repo/heavy-paths.md

## Excerpt

~~~markdown
# Heavy Path Report

Generated: 2026-04-01T05:43:41.055Z
Repo root: `/mnt/data/repo_token_saver_pack`

These are the folders most likely to waste tokens if a coding model reads them too early.

| Directory | Files | Approx bytes | Class |
|---|---:|---:|---|
| `scripts` | 10 | 22865 | neutral |
| `lib` | 1 | 8330 | neutral |
| `config` | 1 | 2837 | neutral |
| `examples` | 1 | 457 | neutral |

## Suggested default excludes

- `taskmanager/node_modules/`
- `taskmanager/dist/`
- `taskmanager/.runtime/`
- `taskmanager/brain/runtime/`
- `taskmanager/brain/retrieval/indexes/normalized/docs/`
- `taskmanager/brain/retrieval/indexes/context-packs/`
- `taskmanager/brain/retrieval/indexes/lancedb/`
- `taskmanager/brain/retrieval/indexes/evals/history/`
- `taskmanager/brain/retrieval/embeddings/`
- `taskmanager/brain/retrieval/indexes/imports-files.jsonl`
- `taskmanager/brain/retrieval/indexes/chunks.jsonl`
~~~