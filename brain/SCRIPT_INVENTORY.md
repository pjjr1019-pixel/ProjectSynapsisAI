# Script Inventory

Generated: 2026-04-01

This document inventories all analysis/tooling scripts in the repository and their canonical locations after migration.

---

## Canonical Script Location

All scripts live at: `taskmanager/brain/scripts/repo-tools/`

The library dependency lives at: `taskmanager/brain/scripts/lib/common.js`

A `package.json` at `taskmanager/brain/scripts/package.json` declares `"type": "commonjs"` so these scripts run as CJS within the ESM `taskmanager/` package.

---

## Scripts

| Script | Description | Dependencies |
|--------|-------------|--------------|
| `00-run-baseline.js` | Entry point — runs scripts 01–04 in sequence to produce baseline repo reports | `../lib/common`, child scripts 01–04 |
| `01-generate-focus-map.js` | Generates `.ai_repo/focus-map.md` — ranked list of files most relevant for AI context | `../lib/common` |
| `02-generate-heavy-path-report.js` | Generates `.ai_repo/heavy-paths.md` — largest directories and files by size | `../lib/common` |
| `03-generate-duplicate-name-report.js` | Generates `.ai_repo/duplicate-name-report.md` — files sharing the same basename | `../lib/common` |
| `04-generate-import-hubs.js` | Generates `.ai_repo/import-hubs.md` — most-imported modules (dependency hubs) | `../lib/common` |
| `05-generate-task-brief.js` | Generates a focused context pack for a given `--task` description | `../lib/common` |
| `06-generate-context-pack.js` | Generates a multi-file context pack for a given `--task` description | `../lib/common` |
| `07-generate-changed-brief.js` | Generates a brief scoped to recently changed files (git-aware) | `../lib/common` |
| `08-generate-llm-handoff.js` | Generates an LLM handoff document with task context and file contents | `../lib/common` |
| `09-generate-source-vs-generated.js` | Generates `.ai_repo/source-vs-generated.md` — classifies files as source vs generated | `../lib/common` |
| `10-generate-repo-knowledge-pack.js` | Generates a whole-repo knowledge pack with markdown cards, lookup indexes, and retrieval summaries | `../lib/common` |
| `generate_repo_map.js` | Generates `REPO_MAP_FULL.json`, `REPO_MAP_FULL.md`, `REPO_FILE_MANIFEST.csv` — full filesystem inventory | none (standalone) |
| `00-run-v2-baseline.js` | Entry point — runs the v2 report set and writes to `.ai_repo_v2/` | `../lib/common`, child scripts 01-09 |
| `00-run-v3-baseline.js` | Entry point — runs the v3 report set and writes to `.ai_repo_v3/` | `../lib/common`, child scripts 01-12 |
| `01-generate-workspace-profile.js` | Generates `.ai_repo_v2/workspace-profile.md` — repo profile and top-level surfaces | `../lib/common` |
| `02-generate-architecture-digest.js` | Generates `.ai_repo_v2/architecture-digest.md` — read-first doc digest | `../lib/common` |
| `03-detect-entrypoints.js` | Generates `.ai_repo_v2/likely-entrypoints.md` — ranked entrypoint hints | `../lib/common` |
| `04-generate-smart-read-order.js` | Generates `.ai_repo_v2/smart-read-order.md` — read order recommendations | `../lib/common` |
| `08-detect-package-scripts.js` | Generates `.ai_repo_v2/package-scripts.md` — package script inventory | `../lib/common` |
| `09-detect-generated-surfaces.js` | Generates `.ai_repo_v2/generated-vs-canonical.md` — generated surface classification | `../lib/common` |
| `10-rank-root-manifests.js` | Generates `.ai_repo_v3/root-manifest-candidates.md` — best root package.json candidates | `../lib/common` |
| `11-generate-stack-fingerprint.js` | Generates `.ai_repo_v3/stack-fingerprint.md` and `.json` — stack inference from manifests | `../lib/common` |
| `12-generate-portable-boundaries.js` | Generates `.ai_repo_v3/portable-boundaries.md` — standalone boundary map | `../lib/common` |

## AI Toolkit Pipeline Modules

| Module | Description |
|--------|-------------|
| `scripts/ai-toolkit/brain-intent-parser.mjs` | Parses a raw query into a deterministic intent object |
| `scripts/ai-toolkit/brain-task-decomposer.mjs` | Converts an intent into atomic tasks and a plan id |
| `scripts/ai-toolkit/brain-workflow-planner.mjs` | Topologically orders tasks into executable workflow steps |
| `scripts/ai-toolkit/brain-tool-selector.mjs` | Maps task types to tool paths and execution metadata |
| `scripts/ai-toolkit/brain-action-compiler.mjs` | Converts a workflow into a dry-run action list |
| `scripts/ai-toolkit/brain-response-validator.mjs` | Validates outputs against schema, assertions, and format rules |
| `scripts/ai-toolkit/brain-retry-controller.mjs` | Retries async work with linear or exponential backoff |
| `scripts/ai-toolkit/brain-memory-cache.mjs` | TTL cache with namespacing and session-aware persistence hooks |
| `scripts/ai-toolkit/brain-context-builder.mjs` | Builds task-relevant context from retrieval, snippets, and cache |
| `scripts/ai-toolkit/brain-macro-engine.mjs` | Executes deterministic macros defined in `brain/data/macros/macros.json` |
| `data/macros/macros.json` | Macro registry for brain-side automation sequences |

## AI Toolkit Modules

| Module | Description |
|--------|-------------|
| `scripts/ai-toolkit/optimizer-task-queue.mjs` | Deterministic priority queue used by the optimizer and brain planner code |
| `scripts/ai-toolkit/optimizer-hotspot-detector.mjs` | Detects CPU / RAM / GPU hotspots from telemetry and module hints |
| `scripts/ai-toolkit/optimizer-health-explainer.mjs` | Builds a deterministic plain-English health summary |
| `scripts/ai-toolkit/optimizer-process-grouper.mjs` | Builds parent / child process trees from flat process lists |
| `scripts/ai-toolkit/index.mjs` | Barrel export surface for the AI toolkit modules |

## Library

| File | Description |
|------|-------------|
| `lib/common.js` | Shared utilities: path resolution, file listing, config loading, scoring, import extraction. Exports `PACK_ROOT`, `DEFAULT_REPO_ROOT`, and ~20 functions. |

---

## Output Directory

All reports are written to: `<repo-root>/.ai_repo/`

---

## How to Run

**From cmd (Windows):**
```
taskmanager\Run Baseline Reports.cmd
```

**Directly:**
```
node taskmanager/brain/scripts/repo-tools/00-run-baseline.js
node taskmanager/brain/scripts/repo-tools/05-generate-task-brief.js --task "your task"
node taskmanager/brain/scripts/repo-tools/generate_repo_map.js
```

**With explicit repo root:**
```
node taskmanager/brain/scripts/repo-tools/00-run-baseline.js --repo /path/to/repo
```

---

## Compatibility Stubs (Old Locations)

| Old Path | Status | Notes |
|----------|--------|-------|
| `taskmanager/scripts/00-run-baseline.js` | ESM stub → forwards to brain/scripts/repo-tools/ | `taskmanager/` is `"type":"module"`; stub uses ESM import syntax |
| `taskmanager/scripts/01-09-*.js` | Original CJS files, not stubbed | Not called directly; broken in ESM context; kept for reference |
| `taskmanager/lib/common.js` | ESM migration notice (throws with helpful message) | Cannot be `require()`d from ESM context |
| `scripts/generate_repo_map.js` (repo root) | CJS stub → forwards to brain/scripts/repo-tools/ | Repo root has no `package.json`, so CJS is the default |
