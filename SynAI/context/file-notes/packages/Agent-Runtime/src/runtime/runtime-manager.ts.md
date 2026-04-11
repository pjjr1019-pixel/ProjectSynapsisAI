<!-- source-hash:503a3387b79f64406becd4596438713a9c70247da09fdec254f6f760c6e42b59; note-hash:704d7cc906903ef161674b94091ed47471db51ee2e96f3d1e6d2fb7c8f5c3fad -->
# SynAI/packages/Agent-Runtime/src/runtime/runtime-manager.ts

## Path
SynAI/packages/Agent-Runtime/src/runtime/runtime-manager.ts

## Area
primary-synai

## Role
support

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../audit
- ../contracts
- ../core
- ../executor
- ../perception
- ../planner
- ../policy
- ../skills

## Main Exports
- AgentRuntimeOptions
- AgentRuntimeService
- createAgentRuntimeService
- createAgentRuntimeService

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/audit/index.ts
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/executor/index.ts
- SynAI/packages/Agent-Runtime/src/perception/index.ts
- SynAI/packages/Agent-Runtime/src/planner/index.ts
- SynAI/packages/Agent-Runtime/src/policy/index.ts
- SynAI/packages/Agent-Runtime/src/runtime/runtime-manager.js

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
