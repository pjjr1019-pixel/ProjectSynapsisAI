# 18-Reorganization Target Structure

## Top-Level Organization (INFERENCE)
- apps/: Entrypoints and UI
- packages/: Core logic, runtime, governance, capabilities
- scripts/: Utilities
- tests/: All tests
- config/: Build/config
- context/: Docs/guides
- docs/: Architecture/decisions
- artifacts/: Generated/analysis
- data/: Runtime/user data
- SynAI/: (TODO: Audit for merge/split/removal)

## Package Boundaries (INFERENCE)
- Centralize capability registry and routing
- Clarify memory/improvement/overlay boundaries
- Merge duplicate adapters/wrappers

## Source-of-Truth Locations (INFERENCE)
- All core logic in packages/

## Runtime/Generated/Data Separation (INFERENCE)
- Separate artifacts/, data/, out/, .runtime/

## Docs/Tests Location (INFERENCE)
- context/, docs/, tests/

## TODO
- Propose detailed structure after deep audit
