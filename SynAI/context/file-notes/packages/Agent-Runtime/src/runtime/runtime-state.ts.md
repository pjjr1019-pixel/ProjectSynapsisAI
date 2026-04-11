<!-- source-hash:1c35a88543b3de02938435c20af068db9a5fa03bc5aa1217a5fc3b1e59fcfa52; note-hash:633c7bfc4839b7b1e076ff49b551f9d4cf69987106b54a0c8796967e4bcaea82 -->
# SynAI/packages/Agent-Runtime/src/runtime/runtime-state.ts

## Path
SynAI/packages/Agent-Runtime/src/runtime/runtime-state.ts

## Area
primary-synai

## Role
support

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ../core

## Main Exports
- AgentRuntimeStateStore
- cloneRuntimeCheckpoint
- cloneRuntimeCheckpoint
- cloneRuntimeJob
- cloneRuntimeJob
- persistRuntimeRunResult
- persistRuntimeRunResult

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/runtime/runtime-state.js
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.ts
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
