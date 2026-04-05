---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/crawlers/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "source"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 70
selected_rank: 3911
content_hash: "cee42382904da41fe2378ec3c33d34ad8d6032e0437e2b9bd6af8f16d1ae073d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
  - "source"
headings:
  - "Architecture"
  - "Configuration"
  - "Core Modules (in portable_lib/)"
  - "Crawlers — Horizons Task Manager"
  - "No UI Changes"
  - "Runtime State"
  - "Runtime Surface"
---

# taskmanager/crawlers/README.md

> Markdown doc; headings Architecture / Configuration / Core Modules (in portable_lib/)

## Key Signals

- Source path: taskmanager/crawlers/README.md
- Surface: source
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 70
- Tags: docs, high-value, markdown, md, source
- Headings: Architecture | Configuration | Core Modules (in portable_lib/) | Crawlers — Horizons Task Manager | No UI Changes | Runtime State

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, high-value, markdown, md, source, taskmanager
- Source link target: taskmanager/crawlers/README.md

## Excerpt

~~~markdown
# Crawlers — Horizons Task Manager

This directory is the local web-ingestion layer for the standalone taskmanager.

## Architecture

Crawler capability is implemented entirely within `taskmanager/portable_lib/` and
is already self-contained. This directory provides:

- `config/` — Local crawler configuration (sources, schedule, limits)
- `runtime/` — Local crawler runtime state (fetch queue, history, logs)

## Core Modules (in portable_lib/)

| Module | Role |
|---|---|
| `portable_lib/brain-browser.mjs` | Web context fetching, scraping, and DOM parsing |
| `portable_lib/brain-web-context.mjs` | Internet provider abstraction |
| `portable_lib/brain-idle-training.mjs` | Crawler scheduling, queue management, idle loop |
| `portable_lib/brain-research-pipeline.mjs` | Multi-step research pipeline |
| `portable_lib/brain-context-pack.mjs` | Context pack assembly from crawled content |

## Runtime Surface

Crawler status is exposed through:
- `server/task-manager-ai.mjs` — `getIdleTrainingSystemSnapshot()` provides crawler fleet status
- The React UI shows **Crawler Fleet** status in the AI sidebar
~~~