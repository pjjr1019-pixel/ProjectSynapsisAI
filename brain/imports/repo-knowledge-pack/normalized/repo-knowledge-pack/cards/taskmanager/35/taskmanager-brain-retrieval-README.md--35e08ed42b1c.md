---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/retrieval/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-retrieval"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 80
selected_rank: 692
content_hash: "d6e9a47e74c480ff776c9483b5c35bf90851e959dd43dc2194b827110582c48d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-retrieval"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
headings:
  - "Imports strategy"
  - "Key Files"
  - "Purpose"
  - "Resolver (reference implementation)"
  - "Retrieval"
  - "Retrieval Profiles"
  - "Retrieval Subsystem — Quick Summary"
  - "Whole-brain chat retrieval (optional)"
---

# taskmanager/brain/retrieval/README.md

> Markdown doc; headings Imports strategy / Key Files / Purpose

## Key Signals

- Source path: taskmanager/brain/retrieval/README.md
- Surface: brain-retrieval
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 80
- Tags: brain, brain-retrieval, docs, markdown, md, neutral
- Headings: Imports strategy | Key Files | Purpose | Resolver (reference implementation) | Retrieval | Retrieval Profiles

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-retrieval, docs, markdown, md, neutral, taskmanager
- Source link target: taskmanager/brain/retrieval/README.md

## Excerpt

~~~markdown
# Retrieval

- **`profiles.json`** — Retrieval profiles (`importLibrary`: `megapack` | `individual_packs` | `knowledge_v1_v2` | `repo_knowledge_pack` | `none` | `all`). Surfaces in [`../MANIFEST.yaml`](../MANIFEST.yaml) reference these by `defaultRetrievalProfile` name.
- **`indexes/chunks.jsonl`** — append-only chunk manifest for RAG and future vector joins (`chunkId` keys embedding rows).
- **`indexes/domains.json`** — quick map from domain → `docIds`.
- **`indexes/imports-files.jsonl`** — per-file paths for Knowledge Pack v1/v2 + MegaPack `MASTER_FILE_INVENTORY.csv`. Regenerate: `npm run brain:index-imports` (repo root) or `node scripts/build-imports-file-index.mjs`.
- **`embeddings/`** — optional vector store layout (see [`embeddings/README.md`](embeddings/README.md)).

## Whole-brain chat retrieval (optional)

- Default BM25 build (`npm run brain:retrieval:build`) indexes **`repo-knowledge-pack`** → `brain/apps/assistant/knowledge/build/retrieval-bm25.json`.
- For chat requests with **full-brain** mode, build a second index from all domains: `npm run brain:retrieval:build:full` → `retrieval-bm25-full.json` (profile `dev-all-drafts`). Hybrid embeddings, if used, should be built for the same BM25 file: `npm run brain:retrieval:embeddings:full`. If the full artifact is missing, the server falls back to the default BM25 index; lexical fallback still searches the full profile when full-brain is requested.
- Refresh the repo knowledge pack with `npm run brain:repo-knowledge-pack:update` after normal edits, or `npm run brain:repo-knowledge-pack` for a full rebuild.

## Resolver (reference implementation)

- [`../../scripts/lib/brain-retrieval.mjs`](../../scripts/lib/brain-retrieval.mjs) — loads `chunks.jsonl` + `profiles.json` with **mtime cache** (clear with `clearBrainRetrievalCache()` if you rewrite indexes in-process).
- [`../../scripts/brain-resolve-chunks.mjs`](../../scripts/brain-resolve-chunks.mjs) — CLI: `node scripts/brain-resolve-chunks.mjs repo-knowledge-pack` or `--list`.

## Imports strategy

See [`../imports/base-knowledge/RETRIEVAL_STRATEGY.md`](../imports/base-knowledge/RETRIEVAL_STRATEGY.md) — use **one** import library mode to avoid duplicate context.
---

# Retrieval Subsystem — Quick Summary

## Purpose
Defines retrieval profiles, chunk indexes, and import library modes for all RAG and knowledge retrieval in Horizons AI.
~~~