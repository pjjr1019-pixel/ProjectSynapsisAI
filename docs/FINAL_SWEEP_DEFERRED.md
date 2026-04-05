# FINAL_SWEEP_DEFERRED.md

Suspicious items found but not changed during the sweep, with reasoning.

---

## Deferred Items

### 1. Shared utility duplication in `shared/task-manager-core.mjs`
- **Issue**: The module contains private copies of `toNumber`, `toInteger`, `toText`, `unique`, `round1`, `clampPercent` — all of which exist identically in `shared/utils.mjs`.
- **Why deferred**: These are private functions, not exported. The module is self-contained by design. Importing from utils.mjs would reduce duplication but create a dependency where none exists today. The functions are 100% stable and tested, so deduplication would save only ~30 lines with minimal payoff and some risk of regression in the most critical data-transformation module.
- **Evidence missing**: No evidence of divergence between local and shared copies.
- **What would be needed**: Confirm shared/utils.mjs is stable API, then replace 6 private function definitions with 1 import line.

---

### 2. Local `toText`/`compactText` in `conversation-snapshot-store.mjs`
- **Issue**: Has private `toText(value, fallback = "")` with a `fallback` parameter and `compactText` that uses `toText` internally. Shared `utils.mjs` has `toText(value)` (no fallback) and `compactText` using `String()` coercion.
- **Why deferred**: Interface difference (`fallback` parameter) and behavioral difference (`String()` vs `toText()` for non-string values). Multiple call sites use the fallback parameter. Replacing requires updating all call sites and verifying behavior — medium-complexity refactor.
- **What would be needed**: Add `fallback` param to `utils.mjs:toText`, audit all callers of both versions, update all call sites, verify snapshot normalization behavior.

---

### 3. `bytesLabel` in `server/runtime-manager/optimization-advisor.mjs`
- **Issue**: Local function that shows only GB/MB (no KB/B). `shared/utils.mjs` has `formatBytes` which covers KB and B too.
- **Why deferred**: The local function intentionally only shows GB/MB for memory usage in an AI optimization context where values below 1 MB never appear. The difference is by design. Replacing would add capability that is never needed.
- **Evidence**: All values passed to `bytesLabel` are at least 120MB.
- **Risk**: Low-value change with zero behavioral benefit.

---

### 4. `brain/scripts/_staging/` tool pack directories
- **Issue**: `_staging/tiny_tool_pack_v1/`, `_staging/guarded_tool_pack_v2/`, `_staging/repo_coder_tool_pack_v3/` remain after the integration script ran.
- **Why deferred**: CLEANUP_AUDIT.md indicates the pack directories were already scheduled for review. The `integrate.js` script in `_staging/` documents the integration process. Removing these would eliminate documentation of how the scripts were assembled.
- **What would be needed**: Confirm registry and integrated scripts are stable, confirm `staging_review/` conflicts have been reviewed, then delete `_staging/` directory.

---

### 5. Duplicate `bootstrap`-style logic in `desktop/windowManager.cjs`
- **Issue**: Not inspected in depth. Window management code may have duplicated window creation patterns.
- **Why deferred**: Ran out of safe sweep time. Window management is high-risk (user-visible, stateful). Any changes need full manual testing in Electron.
- **What would be needed**: Read and audit `windowManager.cjs` fully, run Electron integration tests.

---

### 6. `switchable-launcher.cjs` and `run-electron-dev.cjs`
- **Issue**: Not fully audited. These are dev tooling scripts that may contain stale assumptions.
- **Why deferred**: Not on critical runtime path; changes require manual testing in Electron.
- **What would be needed**: Read both files, check if assumptions about paths/ports match current layout.

---

### 7. `brain/scripts/staging_review/conflicts/` directory
- **Issue**: Contains conflict files from the tool pack integration (non-canonical versions of scripts).
- **Why deferred**: These are explicitly marked for review in `integrate.js` documentation. They are expected to exist.
- **What would be needed**: Human review of conflicts to confirm canonical choice is correct, then delete directory.
