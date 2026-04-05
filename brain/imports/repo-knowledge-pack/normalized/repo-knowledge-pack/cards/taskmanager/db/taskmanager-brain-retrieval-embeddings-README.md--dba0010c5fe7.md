---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/retrieval/embeddings/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-retrieval"
classification: "low-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 60
selected_rank: 782
content_hash: "4ac62171267cf16c61668b66e6db4d1e5a93766b02472e79ebd905b8525bb9d6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-retrieval"
  - "docs"
  - "low-value"
  - "markdown"
  - "md"
headings:
  - "Chunking"
  - "Embeddings (optional local store)"
  - "Git"
  - "Layout (recommended)"
---

# taskmanager/brain/retrieval/embeddings/README.md

> Markdown doc; headings Chunking / Embeddings (optional local store) / Git

## Key Signals

- Source path: taskmanager/brain/retrieval/embeddings/README.md
- Surface: brain-retrieval
- Classification: low-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 60
- Tags: brain, brain-retrieval, docs, low-value, markdown, md
- Headings: Chunking | Embeddings (optional local store) | Git | Layout (recommended)

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-retrieval, docs, low-value, markdown, md, taskmanager
- Source link target: taskmanager/brain/retrieval/embeddings/README.md

## Excerpt

~~~markdown
# Embeddings (optional local store)

## Layout (recommended)

- One row per **`chunkId`** from [`../indexes/chunks.jsonl`](../indexes/chunks.jsonl) (and future heading-level chunks sharing a prefix, e.g. `hz.chunk.*.1`).
- Store vectors in a single file or per-chunk files under this folder; keep a sidecar index mapping `chunkId` → byte offset or file path.
- **Re-embed only when** the source file’s mtime or content hash changes (track in chunk provenance or a small `chunks-meta.json`).

## Chunking

- Prefer **section- or heading-based** splits for long Markdown (see prompts in core) instead of one embedding per entire file.
- Align new chunk rows with the same `chunkId` scheme used in `chunks.jsonl` so [`profiles.json`](../profiles.json) filters stay consistent.

## Git

Large binary stores are usually **gitignored**; document the regen command next to your embedding pipeline.
~~~