---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "docs/integration/BRAIN_FILTER_KIT.md"
source_name: "BRAIN_FILTER_KIT.md"
top_level: "docs"
surface: "docs"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 46
selected_rank: 3378
content_hash: "0392a4c5c6f4e74db559736c15b86d4592e036e2d5d3352591bb628083d55740"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
headings:
  - "1. List all files"
  - "2. Score files by relevance"
  - "All-at-once pipeline"
  - "brain-filter-kit Integration Guide"
  - "Installation"
  - "Overview"
  - "Step-by-step"
  - "Usage"
---

# docs/integration/BRAIN_FILTER_KIT.md

> Markdown doc; headings 1. List all files / 2. Score files by relevance / All-at-once pipeline

## Key Signals

- Source path: docs/integration/BRAIN_FILTER_KIT.md
- Surface: docs
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: docs
- Score: 46
- Tags: brain, docs, markdown, md, neutral
- Headings: 1. List all files | 2. Score files by relevance | All-at-once pipeline | brain-filter-kit Integration Guide | Installation | Overview

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral
- Source link target: docs/integration/BRAIN_FILTER_KIT.md

## Excerpt

~~~markdown
# brain-filter-kit Integration Guide

**Package:** brain-filter-kit
**Location:** `tools/brain-filter-kit/`
**Type:** Manual CLI filtering tool
**Dependencies:** Node.js >=18 (built-ins only)
**Status:** ✅ Ready to use

---

## Overview

`brain-filter-kit` is a low-token, local JavaScript tool for analyzing and cleaning up a large `brain/` knowledge tree. It runs **no API calls** and makes **no external requests**.

It's designed to run **on demand** when you want to:
- Analyze what files are in your brain/
- Score files by relevance and usefulness
- Remove exact duplicates
- Build a clean, curated `approved_corpus/`
- Generate reports showing what was filtered out and why

---

## Installation

The package is already integrated. No npm install needed—it uses only Node.js built-ins.

```
~~~