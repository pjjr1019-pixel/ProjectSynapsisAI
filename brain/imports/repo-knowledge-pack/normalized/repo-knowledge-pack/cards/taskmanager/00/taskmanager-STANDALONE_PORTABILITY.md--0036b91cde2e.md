---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/STANDALONE_PORTABILITY.md"
source_name: "STANDALONE_PORTABILITY.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 12
selected_rank: 4446
content_hash: "d16afc99ed37e4fec891780d653ecccaa1cf5a4bfeb243c709731103f97b4847"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "Architecture"
  - "Backend API (server/)"
  - "Brain Layer (portable_lib/brain-*.mjs + brain/)"
  - "Crawler Layer (portable_lib/brain-idle-training.mjs etc. + crawlers/)"
  - "Electron Shell (desktop/)"
  - "Layer Responsibilities"
  - "Overview"
  - "Standalone Portability — Horizons Task Manager"
---

# taskmanager/STANDALONE_PORTABILITY.md

> Markdown doc; headings Architecture / Backend API (server/) / Brain Layer (portable_lib/brain-*.mjs + brain/)

## Key Signals

- Source path: taskmanager/STANDALONE_PORTABILITY.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 12
- Tags: docs, markdown, md, neutral, source
- Headings: Architecture | Backend API (server/) | Brain Layer (portable_lib/brain-*.mjs + brain/) | Crawler Layer (portable_lib/brain-idle-training.mjs etc. + crawlers/) | Electron Shell (desktop/) | Layer Responsibilities

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/STANDALONE_PORTABILITY.md

## Excerpt

~~~markdown
# Standalone Portability — Horizons Task Manager

## Overview

`taskmanager/` is a fully self-contained portable application folder.  
It can be moved to any location on disk and run without any sibling or parent folders.

---

## Architecture

```
taskmanager/
│
├── desktop/                  Electron shell
│   ├── main.cjs              App entry, spawns API + UI child processes
│   ├── runtime-host.cjs      System monitoring and process management
│   ├── preload.cjs           Secure IPC renderer bridge
│   └── run-electron-dev.cjs  Dev mode launcher
│
├── server/                   HTTP backend (port 8787)
│   ├── dev-api.mjs           HTTP server + optimizer API
│   ├── http-routes.mjs       Route dispatching
│   ├── task-manager-ai.mjs   AI payload aggregation
│   ├── conversation-snapshot-store.mjs
│   └── runtime-manager/      6 runtime-manager service modules
│
├── shared/                   Shared constants
~~~