# REFACTOR_CHANGELOG.md

## 2026-04-04
- Deduplicated preference normalization logic across shared/task-manager-core.mjs and desktop/runtime-host.cjs.
- Extracted normalizePrefs to shared/utils.mjs.
- Updated all call sites to use the shared helper.
- No behavior changes; only code deduplication.
- Imports and dynamic imports verified.
- Ready for test validation.

## 2026-04-04
- Deduplicated JSON file existence/read/parse logic in brain/scripts/ai-toolkit/brain-macro-engine.mjs.
- Now uses readJsonIfExists from portable_lib/brain-build-utils.mjs.
- Local logic removed.
- No behavior changes; only code deduplication.
- Imports verified.
- Ready for test validation.
