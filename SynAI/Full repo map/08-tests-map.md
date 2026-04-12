# 08-Tests Map

## Test Structure (VERIFIED)
- tests/: Top-level test suites (capability, context, e2e, prompt-evals, smoke)
- packages/*/tests/: Package-specific tests (Agent-Runtime, Awareness-Reasoning, etc.)
- packages/Governance-Execution/src/governed-chat/__tests__/: Router and Phase 6 tests

## Coverage
- Core runtime and routing have some direct tests (VERIFIED)
- Coverage is uneven; some areas (e.g., overlays, improvement) are weak (INFERENCE)

## Stale/Suspicious Tests
- TODO: Audit for orphaned or outdated tests

## Critical Regression Tests
- Phase 6 router test: packages/Governance-Execution/src/governed-chat/__tests__/phase6-router.test.ts (VERIFIED)

## TODO
- Map test coverage by runtime spine area
- Identify critical gaps and stale tests
