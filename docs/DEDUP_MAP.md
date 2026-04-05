# DEDUP_MAP.md

## Preference Normalization

### Source Duplicates
- shared/task-manager-core.mjs: function normalizePrefs
- desktop/runtime-host.cjs: inline normalization in buildRuntimeManagerComputerOverview

### Destination Shared Helper
- shared/utils.mjs: export function normalizePrefs

### Updated Call Sites
- shared/task-manager-core.mjs: now imports normalizePrefs from utils.mjs
- desktop/runtime-host.cjs: now dynamically imports normalizePrefs from utils.mjs

### Deferred Duplication
- None for this pattern; all known call sites updated.

## JSON File Read/Parse

### Source Duplicates
- brain/scripts/ai-toolkit/brain-macro-engine.mjs: readMacros
- portable_lib/brain-build-utils.mjs: readJsonIfExists

### Destination Shared Helper
- portable_lib/brain-build-utils.mjs: export function readJsonIfExists

### Updated Call Sites
- brain/scripts/ai-toolkit/brain-macro-engine.mjs: now uses readJsonIfExists

### Deferred Duplication
- None for this pattern; all known call sites updated.
