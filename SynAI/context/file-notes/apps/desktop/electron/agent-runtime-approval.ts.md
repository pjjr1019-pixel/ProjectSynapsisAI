<!-- source-hash:85616081f547c327342e1678f035255faa4a6005c99594a0c9d4e72219bc2513; note-hash:46fc0c85b926b81662dc7b14f13e2d24290d548eb2e401b17b284accbe71b4ce -->
# SynAI/apps/desktop/electron/agent-runtime-approval.ts

## Path
SynAI/apps/desktop/electron/agent-runtime-approval.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @agent-runtime/policy
- @contracts
- @governance-execution

## Main Exports
- createAgentRuntimeApprovalValidator
- createAgentRuntimeApprovalValidator

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/agent-runtime-approval.js
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
