---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "source"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 70
selected_rank: 3912
content_hash: "b1d1e7dea6b7ccd930587d08786a4c10d198f639dde9c2ba3161da92a749e627"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
  - "source"
headings:
  - "Architecture"
  - "Commands"
  - "Environment Variables"
  - "Features"
  - "Horizons Task Manager"
  - "Platform"
  - "Portability"
  - "Quick Start (Standalone)"
---

# taskmanager/README.md

> Markdown doc; headings Architecture / Commands / Environment Variables

## Key Signals

- Source path: taskmanager/README.md
- Surface: source
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 70
- Tags: docs, high-value, markdown, md, source
- Headings: Architecture | Commands | Environment Variables | Features | Horizons Task Manager | Platform

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, high-value, markdown, md, source, taskmanager
- Source link target: taskmanager/README.md

## Excerpt

~~~markdown
# Horizons Task Manager

Standalone portable Electron app — system task manager and AI runtime dashboard.

## Quick Start (Standalone)

```bash
cd taskmanager/
npm install
npm start
```

That's it. No parent repo context required.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Launch the full Electron desktop app |
| `npm run dev:api` | Start API server only (port 8787) |
| `npm run dev` | Start Vite frontend only (port 5180) |
| `npm run build` | TypeScript check + Vite production build |
| `npm test` | TypeScript type check |

## Architecture

```
desktop/      Electron shell (main.cjs, runtime-host.cjs, preload.cjs)
~~~