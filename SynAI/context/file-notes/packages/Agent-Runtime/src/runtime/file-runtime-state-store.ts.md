<!-- source-hash:62686fb82b802f468cdefd153d4ebd849898403b9698e1e52ce02efb21b48a35; note-hash:909f49c5eacf5db3a32221cde0a3cc625d468131a513811188a313c307f29d90 -->
# SynAI/packages/Agent-Runtime/src/runtime/file-runtime-state-store.ts

## Path
SynAI/packages/Agent-Runtime/src/runtime/file-runtime-state-store.ts

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
- node:fs/promises
- node:path

## Main Exports
- FileAgentRuntimeStateStore

## Likely Side Effects
filesystem or process side effects

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/runtime/file-runtime-state-store.js
- SynAI/packages/Agent-Runtime/src/runtime/runtime-state.ts
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.ts

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
