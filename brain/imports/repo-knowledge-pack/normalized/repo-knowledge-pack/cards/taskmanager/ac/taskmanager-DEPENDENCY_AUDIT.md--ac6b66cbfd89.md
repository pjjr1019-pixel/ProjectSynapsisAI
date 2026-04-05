---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/DEPENDENCY_AUDIT.md"
source_name: "DEPENDENCY_AUDIT.md"
top_level: "taskmanager"
surface: "source"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 54
selected_rank: 3950
content_hash: "39bd68f1472f03256420071399aea3a87c79d972fdedb6dc1b5835df247ba46b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
  - "source"
headings:
  - "Confirmed Clean — No External Dependencies"
  - "DEP-001 — REPO_ROOT goes two levels above taskmanager/"
  - "DEP-002 — runtime-host.cjs path construction uses repoRoot + \"taskmanager\" pattern"
  - "DEP-003 — vite.config.ts loads .env from parent of taskmanager/"
  - "DEP-004 — vite.config.ts @shared alias points to root-level shared/"
  - "Dependency Audit — Horizons Task Manager Standalone"
  - "External Dependencies Found"
  - "Scope"
---

# taskmanager/DEPENDENCY_AUDIT.md

> Markdown doc; headings Confirmed Clean — No External Dependencies / DEP-001 — REPO_ROOT goes two levels above taskmanager/ / DEP-002 — runtime-host.cjs path construction uses repoRoot + "taskmanager" pattern

## Key Signals

- Source path: taskmanager/DEPENDENCY_AUDIT.md
- Surface: source
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 54
- Tags: docs, high-value, markdown, md, source
- Headings: Confirmed Clean — No External Dependencies | DEP-001 — REPO_ROOT goes two levels above taskmanager/ | DEP-002 — runtime-host.cjs path construction uses repoRoot + "taskmanager" pattern | DEP-003 — vite.config.ts loads .env from parent of taskmanager/ | DEP-004 — vite.config.ts @shared alias points to root-level shared/ | Dependency Audit — Horizons Task Manager Standalone

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, high-value, markdown, md, source, taskmanager
- Source link target: taskmanager/DEPENDENCY_AUDIT.md

## Excerpt

~~~markdown
# Dependency Audit — Horizons Task Manager Standalone

Generated: 2026-04-01  
Auditor: Automated portability analysis

---

## Scope

Every file in `taskmanager/` was audited for imports, require() calls, path resolution,
and runtime assumptions pointing outside the `taskmanager/` folder.

Files audited:
- `desktop/main.cjs` — Electron entry
- `desktop/runtime-host.cjs` — Runtime host
- `desktop/preload.cjs` — Preload
- `desktop/run-electron-dev.cjs` — Dev launcher
- `server/dev-api.mjs` — HTTP API server
- `server/http-routes.mjs` — Route handlers
- `server/task-manager-ai.mjs` — AI payload aggregation
- `server/conversation-snapshot-store.mjs` — Snapshot persistence
- `server/runtime-manager/*.mjs` — 6 runtime-manager service files
- `portable_lib/*.mjs` — 65 library modules
- `shared/task-manager-core.mjs` — Shared constants
- `src/**/*.tsx` — All React frontend files
- `vite.config.ts` — Vite build config
- `tsconfig.json` — TypeScript config
~~~