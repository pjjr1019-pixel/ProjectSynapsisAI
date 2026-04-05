# Script Migration Report

Date: 2026-04-01
Migration: `taskmanager/scripts/` + `taskmanager/lib/` → `taskmanager/brain/scripts/`

---

## Summary

| Category | Count |
|----------|-------|
| Scripts moved to new canonical location | 11 |
| Library files moved | 1 |
| Config files moved (unchanged) | 0 — config already at `taskmanager/config/` |
| Files updated (path/reference changes) | 4 |
| Compatibility stubs created | 3 |
| New infrastructure files created | 1 (`package.json` CJS island) |
| Validation checks run | 3 |
| Validation pass/fail | 3 / 0 |

---

## Scripts Moved

All scripts copied from `taskmanager/scripts/` and one from `scripts/` (repo root) to `taskmanager/brain/scripts/repo-tools/`:

| File | Source | Destination | Changes |
|------|--------|-------------|---------|
| `00-run-baseline.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None (require paths preserved) |
| `01-generate-focus-map.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `02-generate-heavy-path-report.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `03-generate-duplicate-name-report.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `04-generate-import-hubs.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `05-generate-task-brief.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `06-generate-context-pack.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `07-generate-changed-brief.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `08-generate-llm-handoff.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `09-generate-source-vs-generated.js` | `taskmanager/scripts/` | `taskmanager/brain/scripts/repo-tools/` | None |
| `generate_repo_map.js` | `scripts/` (repo root) | `taskmanager/brain/scripts/repo-tools/` | `REPO_ROOT` path depth fixed: `..` → `../../../../` (4 levels up to `Horizons.AI/`) |

## Library Files Moved

| File | Source | Destination | Changes |
|------|--------|-------------|---------|
| `common.js` | `taskmanager/lib/` | `taskmanager/brain/scripts/lib/` | `PACK_ROOT` depth fixed: 1 level up → 3 levels up to reach `taskmanager/` |

---

## Files Updated (Path/Reference Changes)

| File | Change |
|------|--------|
| `taskmanager/Run Baseline Reports.cmd` | Updated script path: `scripts\00-run-baseline.js` → `brain\scripts\repo-tools\00-run-baseline.js` |
| `taskmanager/brain/scripts/lib/common.js` | `PACK_ROOT`: `path.resolve(__dirname, '..')` → `path.resolve(__dirname, '..', '..', '..')` |
| `taskmanager/brain/scripts/repo-tools/generate_repo_map.js` | `REPO_ROOT`: `path.resolve(__dirname, '..')` → `path.resolve(__dirname, '..', '..', '..', '..')` |

---

## New Infrastructure Files

| File | Purpose |
|------|---------|
| `taskmanager/brain/scripts/package.json` | Declares `"type": "commonjs"` to create a CJS island within the ESM `taskmanager/` package. Required because `taskmanager/package.json` has `"type": "module"` and the scripts use CJS `require()` / `module.exports`. |

---

## Compatibility Stubs Created

| Stub Path | Type | Forwards To |
|-----------|------|-------------|
| `taskmanager/scripts/00-run-baseline.js` | ESM (rewrote to use `import` / `import.meta.url`) | `taskmanager/brain/scripts/repo-tools/00-run-baseline.js` |
| `scripts/generate_repo_map.js` (repo root) | CJS (`'use strict'` + `require`) | `taskmanager/brain/scripts/repo-tools/generate_repo_map.js` |
| `taskmanager/lib/common.js` | ESM migration notice (throws with helpful error message) | Documents new location; cannot be a functional stub in ESM context |

**Why `taskmanager/lib/common.js` is non-functional:** `taskmanager/package.json` has `"type": "module"`, making all `.js` files in `taskmanager/` ESM. A CJS `require()` stub can't work in ESM scope. The file now throws a clear error pointing callers to the correct path (`taskmanager/brain/scripts/lib/common.js`).

---

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| TypeScript check | `npm run test` (tsc --noEmit) in `taskmanager/` | ✅ PASS — no errors |
| Vite build | `npm run build` in `taskmanager/` | ✅ PASS — 42 modules transformed, clean output |
| Baseline scripts smoke test | `node taskmanager/brain/scripts/repo-tools/00-run-baseline.js` | ✅ PASS — all 4 baseline reports written to `.ai_repo/` |
| generate_repo_map stub (repo root) | `node scripts/generate_repo_map.js` | ✅ PASS — forwards to new location, full scan runs |
| taskmanager/scripts stub | `node taskmanager/scripts/00-run-baseline.js` | ✅ PASS — forwards to new location via ESM stub |
| common.js CJS require | `node -e "require('taskmanager/brain/scripts/lib/common.js')"` | ✅ PASS — all 24 exports resolved |

---

## Remaining Items / Known State

- `taskmanager/scripts/01-09` scripts are left in place (not stubbed). They were already non-functional under `"type": "module"` before this migration. Nothing calls them directly — `00-run-baseline.js` orchestrates the run by spawning the new canonical paths.
- The `Run Baseline Reports.cmd` "Next useful commands" hint text still shows the old `_repo_token_saver_pack/scripts/` path (embedded in `00-run-baseline.js` output). This is cosmetic and does not affect functionality.
- `REPO_MAP_README.md` (if present) may need its "how to run" instructions updated to reference `taskmanager/brain/scripts/repo-tools/generate_repo_map.js`.

---

## Post-Migration Directory Layout

```
taskmanager/
  brain/
    scripts/
      package.json          ← CJS island declaration
      lib/
        common.js           ← canonical shared library (PACK_ROOT = taskmanager/)
      repo-tools/
        00-run-baseline.js  ← entry point (runs 01-04)
        01-09-*.js          ← individual report generators
        generate_repo_map.js ← full filesystem inventory generator
    SCRIPT_INVENTORY.md     ← this inventory
    SCRIPT_MIGRATION_REPORT.md ← this report
  lib/
    common.js               ← ESM migration notice (throws, points to new location)
  scripts/
    00-run-baseline.js      ← ESM stub → brain/scripts/repo-tools/
    01-09-*.js              ← original CJS content (non-functional in ESM; not stubbed)
  Run Baseline Reports.cmd  ← updated to call brain/scripts/repo-tools/00-run-baseline.js

scripts/ (repo root)
  generate_repo_map.js      ← CJS stub → taskmanager/brain/scripts/repo-tools/
```
