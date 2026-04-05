---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/STANDALONE_IMPLEMENTATION_PLAN.md"
source_name: "STANDALONE_IMPLEMENTATION_PLAN.md"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 12
selected_rank: 4445
content_hash: "a65edd071f779e0591efe6dfa78e7ffed3826855cb3ec0dd434cb2fe6e2359a0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "All External Dependencies Identified"
  - "BLOCKER 1 — desktop/main.cjs: REPO_ROOT goes two levels up (CRITICAL)"
  - "BLOCKER 2 — desktop/runtime-host.cjs: uses repoRoot + \"taskmanager\" pattern (CRITICAL)"
  - "BLOCKER 3 — vite.config.ts: @shared alias and repoEnv point outside taskmanager/ (MINOR)"
  - "Brain-Related Dependencies"
  - "Current Portability Blockers"
  - "Standalone Implementation Plan — Horizons Task Manager"
  - "Target Architecture"
---

# taskmanager/STANDALONE_IMPLEMENTATION_PLAN.md

> Markdown doc; headings All External Dependencies Identified / BLOCKER 1 — desktop/main.cjs: REPO_ROOT goes two levels up (CRITICAL) / BLOCKER 2 — desktop/runtime-host.cjs: uses repoRoot + "taskmanager" pattern (CRITICAL)

## Key Signals

- Source path: taskmanager/STANDALONE_IMPLEMENTATION_PLAN.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 12
- Tags: docs, markdown, md, neutral, source
- Headings: All External Dependencies Identified | BLOCKER 1 — desktop/main.cjs: REPO_ROOT goes two levels up (CRITICAL) | BLOCKER 2 — desktop/runtime-host.cjs: uses repoRoot + "taskmanager" pattern (CRITICAL) | BLOCKER 3 — vite.config.ts: @shared alias and repoEnv point outside taskmanager/ (MINOR) | Brain-Related Dependencies | Current Portability Blockers

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, source, taskmanager
- Source link target: taskmanager/STANDALONE_IMPLEMENTATION_PLAN.md

## Excerpt

~~~markdown
# Standalone Implementation Plan — Horizons Task Manager

Generated: 2026-04-01  
Status: EXECUTING

---

## Target Architecture

```
taskmanager/
  desktop/          Electron shell — standalone, no repo-root deps
  server/           HTTP API + runtime-manager services
  shared/           Shared constants (task-manager-core.mjs)
  src/              React frontend (TypeScript)
  portable_lib/     65 self-contained ES modules (brain + optimizer + utils)
  brain/            Local brain data: retrieval indexes, runtime state, sessions
  crawlers/         Local crawler layer (config + runtime + README)
  webcrawler/       Legacy placeholder (superseded by crawlers/)
  .runtime/         Runtime state: conversation snapshot, session logs
  node_modules/     Local npm dependencies
  package.json      Fully self-sufficient
  vite.config.ts    Fixed: @shared alias localized
  README.md
  READ_FIRST.md
  STANDALONE_PORTABILITY.md
  .env.example
  DEPENDENCY_AUDIT.md
~~~