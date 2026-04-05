---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "docs/integration/BRAIN_STARTUP.md"
source_name: "BRAIN_STARTUP.md"
top_level: "docs"
surface: "docs"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 46
selected_rank: 3379
content_hash: "1fb6f5f23a433301d59f42757db851139d8908614d48dca828098b8c211f28ee"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
headings:
  - "1. Normal Startup (App + Brain Sync)"
  - "2. Background Sync Only"
  - "3. Force Full Rebuild"
  - "brain-startup Integration Guide"
  - "Files"
  - "Overview"
  - "Quick Start"
  - "Startup Flow Diagram"
---

# docs/integration/BRAIN_STARTUP.md

> Markdown doc; headings 1. Normal Startup (App + Brain Sync) / 2. Background Sync Only / 3. Force Full Rebuild

## Key Signals

- Source path: docs/integration/BRAIN_STARTUP.md
- Surface: docs
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: docs
- Score: 46
- Tags: brain, docs, markdown, md, neutral
- Headings: 1. Normal Startup (App + Brain Sync) | 2. Background Sync Only | 3. Force Full Rebuild | brain-startup Integration Guide | Files | Overview

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, docs, markdown, md, neutral
- Source link target: docs/integration/BRAIN_STARTUP.md

## Excerpt

~~~markdown
# brain-startup Integration Guide

**Package:** horizons-brain-startup-package
**Location:** `tools/brain-startup/` + root launchers (BAT files)
**Type:** Automatic background worker
**Dependencies:** Node.js (built-ins only)
**Status:** ✅ Ready to use

---

## Overview

`brain-startup` is an automatic background worker that:

- Runs **every time you start the app** (from the provided launchers)
- **Does NOT block** app startup (spawns detached background worker)
- Performs **lightweight incremental filtering** by default
- **Auto-upgrades to full rebuild** if many files changed
- Writes clean `approved_corpus/` for retrieval
- Uses **lock files** to prevent duplicate workers
- Logs all activity for debugging

It's designed to be **safe to run on every app start** because it's incremental and non-blocking.

---

## Files
~~~