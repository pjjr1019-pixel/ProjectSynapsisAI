<!-- source-hash:7d919e8bcb4bf28272d22050c593d44c9feee49c0dfe1d74c6ab3ac603740691; note-hash:14ba5643ffedc5e1d265ddea87228a9e09b4dcd8d0c336da8b93672720b15a46 -->
# SynAI/apps/desktop/electron/reply-formatting.ts

## Path
SynAI/apps/desktop/electron/reply-formatting.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ../src/features/local-chat/utils/liveUsageReply
- @contracts

## Main Exports
- cleanupPlainTextAnswer
- cleanupPlainTextAnswer
- formatAwarenessReply
- formatAwarenessReply

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/reply-formatting.js
- SynAI/apps/desktop/electron/reply-formatting.test.js
- SynAI/apps/desktop/electron/reply-formatting.test.ts
- SynAI/apps/desktop/src/features/local-chat/utils/liveUsageReply.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/reply-formatting.test.js
- SynAI/apps/desktop/electron/reply-formatting.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
