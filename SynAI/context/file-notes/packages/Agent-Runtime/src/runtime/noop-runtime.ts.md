<!-- source-hash:e4c13dd5436047aed986fef9c01faf0c7d1390e3783a5ff77f6ad7ae9869f872; note-hash:7cd1dd2747ee1cdafbedf78db97bf426ea89cf21c131c61c1ef0a6f42960898b -->
# SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.ts

## Path
SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.ts

## Area
primary-synai

## Role
support

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ./runtime-manager

## Main Exports
- AgentTaskInput
- AgentTaskResult
- PolicyBlock
- runAgentTask
- runNoopAgentTask
- runNoopAgentTask

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.js
- SynAI/packages/Agent-Runtime/src/runtime/runtime-manager.ts

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
