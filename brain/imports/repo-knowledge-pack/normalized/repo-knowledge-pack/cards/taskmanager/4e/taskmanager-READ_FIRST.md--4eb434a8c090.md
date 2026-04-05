---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/READ_FIRST.md"
source_name: "READ_FIRST.md"
top_level: "taskmanager"
surface: "source"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 54
selected_rank: 3953
content_hash: "9dd94174b4616a237e6f8c5336747fff01924f848bf1b7f2ca3c2a8fa0b8be5b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
  - "source"
headings:
  - "Brain / Runtime Entrypoints"
  - "Crawler / Web-Ingestion Entrypoints"
  - "Entrypoints"
  - "How to Run (Standalone)"
  - "READ FIRST — Horizons Task Manager (Standalone)"
  - "Runtime Folders"
  - "Terminal 1 — API server"
  - "Terminal 2 — Vite frontend"
---

# taskmanager/READ_FIRST.md

> Markdown doc; headings Brain / Runtime Entrypoints / Crawler / Web-Ingestion Entrypoints / Entrypoints

## Key Signals

- Source path: taskmanager/READ_FIRST.md
- Surface: source
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 54
- Tags: docs, high-value, markdown, md, source
- Headings: Brain / Runtime Entrypoints | Crawler / Web-Ingestion Entrypoints | Entrypoints | How to Run (Standalone) | READ FIRST — Horizons Task Manager (Standalone) | Runtime Folders

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, high-value, markdown, md, source, taskmanager
- Source link target: taskmanager/READ_FIRST.md

## Excerpt

~~~markdown
# READ FIRST — Horizons Task Manager (Standalone)

This is a self-contained portable app folder.  
Everything it needs is inside `taskmanager/`. No external folders required.

---

## How to Run (Standalone)

```
cd taskmanager/
npm install
npm start
```

`npm start` launches the Electron desktop shell, which automatically starts
the backend API and Vite frontend in child processes.

For development without Electron:
```
# Terminal 1 — API server
npm run dev:api

# Terminal 2 — Vite frontend
npm run dev
```

---
~~~