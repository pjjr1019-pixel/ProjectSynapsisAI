<!-- source-hash:3c35e9655e71fda44141fbf5766972068e69c79d005ce95c42521f01d1f05bc0; note-hash:22e3370361391d5bc0c42e6f378e51179fd73bfd02650cfa44bd32196dfb7fcb -->
# SynAI/apps/desktop/electron/main.ts

## Path
SynAI/apps/desktop/electron/main.ts

## Area
primary-synai

## Role
canonical

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ../src/features/feature-registry
- ../src/features/local-chat/utils/awarenessCards
- ../src/features/local-chat/utils/liveUsageReply
- ./agent-runtime-adapters
- ./agent-runtime-approval
- ./capability-runner
- ./desktop-actions
- ./governed-chat

## Main Exports
- none

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/agent-runtime-adapters.ts
- SynAI/apps/desktop/electron/agent-runtime-approval.ts
- SynAI/apps/desktop/electron/capability-runner.ts
- SynAI/apps/desktop/electron/desktop-actions.ts
- SynAI/apps/desktop/electron/governed-chat.ts
- SynAI/apps/desktop/electron/ipc-registration.ts
- SynAI/apps/desktop/electron/main.js
- SynAI/apps/desktop/electron/main.prompting-delegation.test.ts

## Edit Risk
high

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/main.prompting-delegation.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
