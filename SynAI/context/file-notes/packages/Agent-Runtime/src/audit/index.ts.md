<!-- source-hash:543ffbdb1ffdbe342165aa16457d7e590522f9710aa066e83007e0f79342e8be; note-hash:a0f79b681c0f95da8d9f521a18e576a28387ccff69b002ab11f0b14d91619371 -->
# SynAI/packages/Agent-Runtime/src/audit/index.ts

## Path
SynAI/packages/Agent-Runtime/src/audit/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ../core
- node:fs/promises
- node:path

## Main Exports
- AuditStore
- createAuditEvent
- createAuditEvent
- FileAuditStore
- InMemoryAuditStore

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Agent-Runtime/src/audit/index.js
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
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
