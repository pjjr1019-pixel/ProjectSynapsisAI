<!-- source-hash:ef110bfe5732bf8aba8c980bee1b2e11c5dbde77208be010ec98e160bcfb3026; note-hash:130e9d24338ad9647a71c2839017cddcf8e4deb5a0b80e054d47454c0b460568 -->
# SynAI/packages/Agent-Runtime/src/evals/index.ts

## Path
SynAI/packages/Agent-Runtime/src/evals/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ../core
- ../runtime/noop-runtime

## Main Exports
- buildNoopRuntimeEvalCases
- buildNoopRuntimeEvalCases
- evaluateAgentRuntimeCase
- evaluateAgentRuntimeCase
- runAgentRuntimeEvalSuite
- runAgentRuntimeEvalSuite
- RuntimeEvalRunner

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/evals/index.js
- SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.ts
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

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
