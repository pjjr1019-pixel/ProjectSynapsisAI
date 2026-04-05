# FINAL_SWEEP_AUDIT.md

Issues found, categorized, and actioned during the final sweep pass.

---

## Issue Log

### 1. Broken ESM tests — missing `__dirname`
- **Category**: Broken tests
- **Files**: `tests/regression/config-load.test.mjs`, `tests/regression/taskmanager-paths.test.mjs`
- **Why it mattered**: Both tests referenced `__dirname` without defining it, causing immediate `ReferenceError` on every run. All regression coverage they were meant to provide was completely absent.
- **Action**: Added `import { fileURLToPath } from "node:url"` and `const __dirname = path.dirname(fileURLToPath(import.meta.url))` to both files. Also added `__filename` to `taskmanager-paths.test.mjs` which uses it directly.
- **Risk**: Low — test-only change, no behavior impact.
- **Validation**: Both test files now pass all assertions.

---

### 2. Wrong path in `desktop-main-startup.test.mjs`
- **Category**: Broken test
- **Files**: `tests/regression/desktop-main-startup.test.mjs`
- **Why it mattered**: The path to `main.cjs` was `path.resolve(__dirname, "..", "desktop", "main.cjs")` which resolves to `tests/desktop/main.cjs` (nonexistent), not `desktop/main.cjs`. Also had unused `spawn` import and unused `t` parameter.
- **Action**: Added extra `".."` in the path, removed unused `spawn` import, removed unused `t` parameter from the test callback.
- **Risk**: Low — test-only change.
- **Validation**: File now constructs the correct path to `desktop/main.cjs`.

---

### 3. Dead re-export wrapper files in `portable_lib/`
- **Category**: Dead code
- **Files**: `portable_lib/task-manager-core.mjs`, `portable_lib/task-manager-ai.mjs`, `portable_lib/runtime-manager/` (6 files)
- **Why it mattered**: Each was a single-line `export * from "..."` that nothing imported. Zero consumers anywhere in the codebase. They added noise, misled readers about where canonical code lived, and created false impressions of an active indirection layer.
- **Action**: Deleted all 8 files (6 runtime-manager wrappers + task-manager-core.mjs + task-manager-ai.mjs).
- **Risk**: Low — confirmed zero imports via comprehensive grep.
- **Validation**: Grep for `portable_lib/task-manager-core`, `portable_lib/task-manager-ai`, `portable_lib/runtime-manager` in all source files returns no matches.

---

### 4. Orphaned `.d.mts` stub file
- **Category**: Dead code
- **Files**: `portable_lib/task-manager-core.d.mts`
- **Why it mattered**: Content was literally `[...task-manager-core.d.mts content copied from shared...]` — a placeholder note, not valid TypeScript. Would cause a TS parse error if ever consumed. Also orphaned after its companion `.mjs` was deleted.
- **Action**: Deleted.
- **Risk**: Low — not valid TypeScript, companion `.mjs` already deleted.
- **Validation**: File removed.

---

### 5. Duplicate `toNumber`/`clampPercent` in server files
- **Category**: Duplicate code
- **Files**: `server/runtime-manager/gpu-stats-service.mjs`, `server/runtime-manager/system-metrics-service.mjs`
- **Why it mattered**: Both files had local private copies of `toNumber` and `clampPercent` that were byte-for-byte identical to `shared/utils.mjs` exports. `process-monitor-service.mjs` in the same directory already imported from shared — inconsistent standard in the same package.
- **Action**: Replaced local copies with `import { toNumber, clampPercent } from "../../shared/utils.mjs"`.
- **Risk**: Low — implementations are identical.
- **Validation**: All tests pass.

---

### 6. Duplicate `toNumber` in `conversation-snapshot-store.mjs`
- **Category**: Duplicate code
- **Files**: `server/conversation-snapshot-store.mjs`
- **Why it mattered**: Had a local `toNumber` identical to `shared/utils.mjs`. Other local functions (`toText`, `compactText`) have different signatures so were left in place.
- **Action**: Added `import { toNumber } from "../shared/utils.mjs"` and removed the local copy.
- **Risk**: Low — identical implementation.
- **Validation**: All tests pass.

---

### 7. Mojibake in `desktop/main.cjs` splash log message
- **Category**: Polish / professionalism
- **Files**: `desktop/main.cjs`
- **Why it mattered**: `"Preloading Task Manager interfaceâ€¦"` — the UTF-8 ellipsis `…` was encoded as Latin-1 mojibake. Users would see garbled text on the splash screen during startup.
- **Action**: Replaced `interfaceâ€¦` with `interface…`.
- **Risk**: Low — string literal fix.
- **Validation**: Correct Unicode in the file.

---

### 8. Dead code after `return;` in `bootstrapLegacy()`
- **Category**: Dead code
- **Files**: `desktop/main.cjs`
- **Why it mattered**: The `bootstrapLegacy` function had a `return;` statement followed by ~45 lines of unreachable code (old startup logic from a previous refactor). This code could never execute and was confusing to read.
- **Action**: Removed the unreachable code block (lines after `return;`).
- **Risk**: Low — unreachable code, no behavior change.
- **Validation**: File parses correctly.

---

### 9. Dead `bootstrapLegacy` function
- **Category**: Dead code
- **Files**: `desktop/main.cjs`
- **Why it mattered**: `bootstrapLegacy` was defined (~90 lines) but never called. Only `bootstrap` is invoked via `app.whenReady().then(bootstrap)`. The legacy function was a superseded version left behind during a refactor.
- **Action**: Deleted the entire `bootstrapLegacy` function.
- **Risk**: Low — confirmed not called anywhere in the repo.
- **Validation**: `grep bootstrapLegacy` returns no results outside of `.git`.

---

### 10. Stale `src/` and deleted-file references in `config/horizons-ai.defaults.json`
- **Category**: Stale references
- **Files**: `config/horizons-ai.defaults.json`
- **Why it mattered**: `defaultTaskReadOrder` included `taskmanager/src/main.tsx`, `taskmanager/src/App.tsx`, `taskmanager/src/components/RuntimeManagerSidebar.tsx` (no `src/` directory exists in this portable build) and `taskmanager/portable_lib/task-manager-ai.mjs` (deleted). `priorityGlobs` included `src/**/*.ts` and `src/**/*.tsx` patterns. `highValuePrefixes` included `taskmanager/src/`.
- **Action**: Removed all stale `src/` entries, removed deleted file reference, replaced with accurate entries pointing to existing paths.
- **Risk**: Low — config only used for AI tooling context, not runtime.
- **Validation**: Config tests pass.

---

## Summary Counts
- Broken tests fixed: 3 files (7 test cases now passing that were failing or unreliable)
- Dead files deleted: 8 (portable_lib re-export wrappers + stub .d.mts)
- Dead functions removed: 2 (bootstrapLegacy + dead code block in it)
- Duplicate utilities removed: 4 (toNumber×3 + clampPercent×2 across 3 server files)
- Stale config entries cleaned: 7 (src/ paths + deleted file references)
- Encoding bug fixed: 1 (mojibake ellipsis)
