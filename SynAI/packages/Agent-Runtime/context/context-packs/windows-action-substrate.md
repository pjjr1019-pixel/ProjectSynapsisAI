# Windows Action Substrate Pack

## Objective
Prepare layer 1 work so future prompts can add a typed Windows action substrate without sneaking in live automation too early.

## Files To Read First
- `SynAI/packages/Agent-Runtime/specs/01-action-substrate.md`
- `SynAI/docs/decisions/ADR-002-runtime-entrypoint-selection.md`
- `SynAI/docs/decisions/ADR-003-foundation-before-real-automation.md`
- `SynAI/docs/architecture/governed-execution-roadmap.md`
- `SynAI/docs/governance-execution-usage.md`
- `SynAI/packages/Governance-Execution/src/contracts.ts`
- `SynAI/packages/Governance-Execution/src/execution/windows-action-catalog.ts`
- `SynAI/packages/Governance-Execution/src/execution/windows-actions.ts`
- `SynAI/apps/desktop/electron/workflow-orchestrator.ts`

## Files Not To Touch Casually
- `SynAI/apps/desktop/src/*`
- `SynAI/packages/Agent-Runtime/src/*`
- `SynAI/packages/Awareness-Reasoning/src/memory/*`

## Acceptance Criteria
- Action requests, proposals, results, and approvals stay typed.
- No live Windows calls escape the adapter boundary.
- Rollback or compensation metadata stays explicit.
- Dry-run remains the default path.

## Validation Command
- `cd SynAI; npx vitest run tests/capability/workflow-orchestrator.test.ts tests/capability/policy-engine.test.ts tests/capability/governance-command-bus.test.ts`
