<!-- source-hash:c5b7ee617ef4409865ba63fa19fb55b82e034ad7d23af89a5a1b8d96782beff2; note-hash:47e51ff4c315d13e81cd28f83ec7b8f71022226bb5796e260260f7b0923bb102 -->
# SynAI/apps/desktop/electron/ipc-registration.ts

## Path
SynAI/apps/desktop/electron/ipc-registration.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- none

## Main Exports
- createValidatedIpcHandleRegistry
- createValidatedIpcHandleRegistry
- IpcInvokeHandler
- ValidatedIpcHandleRegistry

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/ipc-registration.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/ipc-registration.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
