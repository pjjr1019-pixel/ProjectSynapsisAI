# Commit Boundaries

Generated: 2026-04-01

This plan separates high-signal product code from volatile generated/runtime artifacts.

## Boundary 1: Specialist Pipeline

Purpose: specialist model pipeline implementation and tests.

Include:

- `server/dev-api.mjs`
- `src/components/developer-mode/DeveloperModeWorkspace.tsx`
- `portable_lib/specialist/**`
- `tests/specialist/**`
- `brain/scripts/registry/script_manifest.schema.json`
- `package.json` (only specialist script entries)

Exclude:

- runtime snapshots/logs/state files
- `_staging` pack contents

## Boundary 2: Active Scripts Runtime and Bridge

Purpose: active scripts runner evolution and incremental staged-pack promotion.

Include:

- `brain/scripts/core/runtime.js`
- `brain/scripts/indexing/tool_catalog.js`
- `brain/scripts/docs/SCRIPT_PACK_INTEGRATION_STATUS.md`
- `brain/scripts/docs/INTEGRATION_REPORT.md`
- `brain/scripts/docs/AI_USAGE_GUIDE.md`
- `brain/scripts/docs/COMMIT_BOUNDARIES.md`
- `brain/scripts/registry/integration_manifest.json`

Exclude:

- `_staging/**`
- runtime logs/snapshots

## Boundary 3: Staging Packs (Vendor/Import Snapshot)

Purpose: preserve imported packs for review and optional direct use.

Include:

- `brain/scripts/_staging/guarded_tool_pack_v2/**`
- `brain/scripts/_staging/repo_coder_tool_pack_v3/**`
- `brain/scripts/_staging/tiny_tool_pack_v1/**`
- `brain/scripts/_staging/integrate.js`

Notes:

- Keep this boundary isolated from active runtime behavior commits.
- Treat as imported content; avoid mixing with logic refactors.

## Boundary 4: Runtime Artifacts (Optional, Usually Exclude)

Purpose: generated operational artifacts, usually not source-controlled.

Usually exclude:

- `brain/runtime/logs/**`
- `brain/runtime/sessions/snapshots/**`
- `brain/runtime/learning/state/**`
- local `.env`

If policy requires check-in, use separate commit labeled operational snapshot.

## Suggested Commit Order

1. Specialist pipeline commit.
2. Active scripts runtime and bridge commit.
3. Staging pack import commit.
4. Optional operational snapshot commit (if required).
