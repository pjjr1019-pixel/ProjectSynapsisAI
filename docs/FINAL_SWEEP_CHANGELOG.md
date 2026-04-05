# FINAL_SWEEP_CHANGELOG.md

Chronological log of all changes made during the final sweep pass.
Date: 2026-04-04

---

## Batch 1 — Broken test fixes

**Files changed**: `tests/regression/config-load.test.mjs`, `tests/regression/taskmanager-paths.test.mjs`, `tests/regression/desktop-main-startup.test.mjs`

### config-load.test.mjs
- Added `import { fileURLToPath } from "node:url"`
- Added `const __dirname = path.dirname(fileURLToPath(import.meta.url))`
- Fixed config path: added extra `".."` level (test is in `tests/regression/`, config is at `config/`)

### taskmanager-paths.test.mjs
- Added `const __filename = fileURLToPath(import.meta.url)` and `const __dirname = path.dirname(__filename)` (both needed by the test)
- Fixed module path: added extra `".."` level for same reason

### desktop-main-startup.test.mjs
- Added extra `".."` to `mainPath` resolution (was resolving to `tests/desktop/main.cjs` instead of `desktop/main.cjs`)
- Removed unused `import { spawn } from "node:child_process"` import
- Removed unused `t` parameter from test callback

**Tests run after**: All 7 regression + scheduler tests pass.

---

## Batch 2 — Dead portable_lib re-export wrappers

**Files deleted**:
- `portable_lib/task-manager-core.mjs` (single-line re-export of shared/task-manager-core.mjs, zero consumers)
- `portable_lib/task-manager-ai.mjs` (single-line re-export of server/task-manager-ai.mjs, zero consumers)
- `portable_lib/task-manager-core.d.mts` (placeholder stub, not valid TypeScript)
- `portable_lib/runtime-manager/ai-runtime-service.mjs` (re-export wrapper, zero consumers)
- `portable_lib/runtime-manager/gpu-stats-service.mjs` (re-export wrapper, zero consumers)
- `portable_lib/runtime-manager/optimization-advisor.mjs` (re-export wrapper, zero consumers)
- `portable_lib/runtime-manager/process-monitor-service.mjs` (re-export wrapper, zero consumers)
- `portable_lib/runtime-manager/safe-process-controller.mjs` (re-export wrapper, zero consumers)
- `portable_lib/runtime-manager/system-metrics-service.mjs` (re-export wrapper, zero consumers)

**Reason**: Grep confirmed no imports from any of these paths anywhere in the codebase.

**Tests run after**: All 7 tests pass.

---

## Batch 3 — Duplicate utility function centralization

**Files changed**: `server/runtime-manager/gpu-stats-service.mjs`, `server/runtime-manager/system-metrics-service.mjs`, `server/conversation-snapshot-store.mjs`

### gpu-stats-service.mjs
- Removed local `toNumber` and `clampPercent` function definitions
- Added `import { toNumber, clampPercent } from "../../shared/utils.mjs"`

### system-metrics-service.mjs
- Removed local `toNumber` and `clampPercent` function definitions
- Added `import { toNumber, clampPercent } from "../../shared/utils.mjs"`

### conversation-snapshot-store.mjs
- Removed local `toNumber` function definition
- Added `import { toNumber } from "../shared/utils.mjs"` (local `toText`/`compactText` have different signatures — deferred)

**Tests run after**: All 7 tests pass.

---

## Batch 4 — desktop/main.cjs cleanup

**File changed**: `desktop/main.cjs`

### Mojibake fix
- Fixed `"Preloading Task Manager interfaceâ€¦"` → `"Preloading Task Manager interface…"` (UTF-8 ellipsis was stored as Latin-1 mojibake)

### Dead code after `return;`
- Removed ~45 lines of unreachable code in `bootstrapLegacy()` that came after a `return;` statement. This was old startup logic from a prior refactor left behind by accident.

### Dead `bootstrapLegacy` function
- Removed the entire `bootstrapLegacy` function (~90 lines). Only `bootstrap` is invoked via `app.whenReady().then(bootstrap)`. The legacy function was the superseded version.

**Tests run after**: All 7 tests pass (desktop/main.cjs is not directly testable without Electron, but no-import smoke test logic is intact).

---

## Batch 5 — Config stale references

**File changed**: `config/horizons-ai.defaults.json`

- Removed `taskmanager/src/` from `highValuePrefixes` (no `src/` directory exists in this portable build)
- Removed `taskmanager/src/**/*.ts` and `taskmanager/src/**/*.tsx` from `priorityGlobs`
- Replaced `defaultTaskReadOrder` entries: removed `src/main.tsx`, `src/App.tsx`, `src/components/...`, `portable_lib/task-manager-ai.mjs` (deleted file). Added accurate paths: `shared/utils.mjs`, `desktop/main.cjs`, `portable_lib/taskmanager-paths.mjs`

**Tests run after**: All 7 tests pass (config-load tests specifically verify the config is valid JSON with required fields).
