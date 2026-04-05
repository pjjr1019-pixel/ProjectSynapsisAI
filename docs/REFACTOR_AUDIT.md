# REFACTOR_AUDIT.md

## 2026-04-04: Preference Normalization Deduplication

### Repeated Pattern Found
- Preference normalization logic (monitoringEnabled, ignoredFingerprints, keepFingerprints, snoozedUntil, showProtected) was duplicated in:
  - shared/task-manager-core.mjs
  - desktop/runtime-host.cjs
- Both modules implemented nearly identical logic for defaulting and normalizing user preferences.

### Compression Opportunity
- Extract to a single shared helper in shared/utils.mjs.
- All modules can import and use this, reducing code volume and risk of drift.

### Before/After Rationale
- Before: Each module had its own normalization logic, risking drift and increasing maintenance cost.
- After: All modules use a single, canonical normalizePrefs helper.

### Risk Level
- Low. The logic is pure and stateless, and all call sites were updated to use the shared version.

### Validation Used
- All call sites updated.
- Imports verified.
- No behavior change expected; only code deduplication.

---

## 2026-04-04: JSON File Read Deduplication

### Repeated Pattern Found
- JSON file existence/read/parse logic was duplicated in:
  - brain/scripts/ai-toolkit/brain-macro-engine.mjs (readMacros)
  - portable_lib/brain-build-utils.mjs (readJsonIfExists)

### Compression Opportunity
- Use readJsonIfExists from brain-build-utils.mjs everywhere.
- Remove local logic from brain-macro-engine.mjs.

### Before/After Rationale
- Before: Each module checked existence, read, and parsed JSON files separately.
- After: All modules use a single, canonical helper.

### Risk Level
- Low. The logic is pure and stateless, and all call sites were updated to use the shared version.

### Validation Used
- All call sites updated.
- Imports verified.
- No behavior change expected; only code deduplication.
