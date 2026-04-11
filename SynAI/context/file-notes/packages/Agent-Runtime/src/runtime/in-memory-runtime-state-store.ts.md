<!-- source-hash:30390cd9a97cc4990b82e74aec7ddde4898a150aef6e677406bb9205a24c4189; note-hash:bf9be4d718eafe080c24b6b0de798895917b624df663a5da032661ec8a3b33f3 -->
# SynAI/packages/Agent-Runtime/src/runtime/in-memory-runtime-state-store.ts

## Path
SynAI/packages/Agent-Runtime/src/runtime/in-memory-runtime-state-store.ts

## Area
primary-synai

## Role
support

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ../core
- ./runtime-state

## Main Exports
- InMemoryAgentRuntimeStateStore

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/runtime/in-memory-runtime-state-store.js
- SynAI/packages/Agent-Runtime/src/runtime/runtime-state.ts
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
