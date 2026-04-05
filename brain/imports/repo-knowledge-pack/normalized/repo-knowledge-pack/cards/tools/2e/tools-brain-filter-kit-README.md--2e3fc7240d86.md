---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/README.md"
source_name: "README.md"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 32
selected_rank: 3388
content_hash: "c7539e462fe6b0b627f56871355b2ee8ce633855d9d4b9b4987a8cdc29ebd6c0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "tools"
headings:
  - "1. Run the full pipeline"
  - "2. Or run step by step"
  - "3. Show best docs"
  - "brain-filter-kit"
  - "Keep / block behavior"
  - "Output"
  - "Quick start"
  - "What it does"
---

# tools/brain-filter-kit/README.md

> Markdown doc; headings 1. Run the full pipeline / 2. Or run step by step / 3. Show best docs

## Key Signals

- Source path: tools/brain-filter-kit/README.md
- Surface: tools
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: tools
- Score: 32
- Tags: brain, docs, markdown, md, neutral, tools
- Headings: 1. Run the full pipeline | 2. Or run step by step | 3. Show best docs | brain-filter-kit | Keep / block behavior | Output

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral, tools
- Source link target: tools/brain-filter-kit/README.md

## Excerpt

~~~markdown
# brain-filter-kit

A low-token local JS toolkit for cleaning up a large `brain/` tree before your local AI touches it.

It is tuned for the structure you described:

- `brain/apps/<surface>/canonical/` = highest trust
- `brain/apps/<surface>/imports/` = medium trust
- `brain/apps/<surface>/drafts/` = low trust
- `brain/memory/` = separate but useful
- `brain/apps/<surface>/knowledge/build/` = generated, usually not source truth
- `brain/retrieval/indexes/` = runtime only, block by default
- `chunks.jsonl` and `domains.json` = runtime artifacts, block by default

## What it does

- inventories every file under `brain/`
- scores files with cheap local heuristics
- blocks obvious junk paths
- removes exact duplicates
- builds a clean `approved_corpus/`
- writes reports so you can review what got filtered out

No API calls. No embeddings. No token burn.

## Quick start

Copy this folder somewhere inside your repo, then run it **from your repo root** so `brain/` resolves correctly.
~~~