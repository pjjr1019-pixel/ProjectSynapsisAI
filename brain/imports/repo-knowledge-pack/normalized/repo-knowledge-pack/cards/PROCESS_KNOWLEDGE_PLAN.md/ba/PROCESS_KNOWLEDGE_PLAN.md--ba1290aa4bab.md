---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "PROCESS_KNOWLEDGE_PLAN.md"
source_name: "PROCESS_KNOWLEDGE_PLAN.md"
top_level: "PROCESS_KNOWLEDGE_PLAN.md"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 22
selected_rank: 4001
content_hash: "0b4ffb04b1a1a79e35140709c7da2237b572b5ba345282e073f2b844435b121d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "1. Repo Findings"
  - "2. Proposed Architecture"
  - "Architecture Touchpoints"
  - "Context"
  - "Integration Risks"
  - "Process Knowledge System — Implementation Plan"
  - "Relevant Files"
  - "Reusable Components"
---

# PROCESS_KNOWLEDGE_PLAN.md

> Markdown doc; headings 1. Repo Findings / 2. Proposed Architecture / Architecture Touchpoints

## Key Signals

- Source path: PROCESS_KNOWLEDGE_PLAN.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: PROCESS_KNOWLEDGE_PLAN.md
- Score: 22
- Tags: docs, markdown, md, neutral, source
- Headings: 1. Repo Findings | 2. Proposed Architecture | Architecture Touchpoints | Context | Integration Risks | Process Knowledge System — Implementation Plan

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, PROCESS_KNOWLEDGE_PLAN.md, source
- Source link target: PROCESS_KNOWLEDGE_PLAN.md

## Excerpt

~~~markdown
# Process Knowledge System — Implementation Plan

## Context

The app already enumerates running Windows processes and displays them in a process list UI. Right-clicking a process can "Search online" (currently just `window.open()` with a Bing URL in `RuntimeManagerSidebar.tsx:371-375` — frontend-only, no backend path to reuse). The goal is to build a full backend-first feature set that:

- Persists normalized knowledge about every observed executable identity into `brain/processes/`
- Enriches that knowledge silently using the existing `brain-web-context.mjs` Tavily/DDG search
- Listens for foreign/unknown executable identities and queues them for enrichment
- Exposes a Dev Menu tab for searching the accumulated process knowledge

This must be incremental, lightweight, and non-disruptive to existing app behavior.

---

## 1. Repo Findings

### Relevant Files

| File | Role |
|---|---|
| `desktop/runtime-host.cjs` | Electron main; PowerShell process enumeration; IPC handler registration |
| `desktop/preload.cjs` | Exposes `window.horizonsDesktop.runtimeManager` / `taskManager` to renderer |
| `server/dev-api.mjs` | HTTP server (port 8787); starts optimizer control loop; registers all routes |
| `server/http-routes.mjs` | HTTP route dispatch pattern to follow for new routes |
| `server/runtime-manager/process-monitor-service.mjs` | Transforms raw PowerShell snapshot via `buildProcessMonitorOverview()` |
| `src/components/runtime-manager/RuntimeManagerSidebar.tsx` | "Search online" at lines 371-375: `window.open(Bing URL)` — frontend only |
| `src/components/runtime-manager/ProcessContextMenu.tsx` | Right-click menu component |
~~~