<!-- source-hash:d9e07259e966ab8fb3eb7a309e0536e0e383a57e128f0498e477bc05be397526; note-hash:5fd5d034793edcf546651b5a1471039cbb5bfc334a03aa40fb9ec6d3659c3d27 -->
# SynAI/apps/desktop/electron/prompting/diagnostics.ts

## Path
SynAI/apps/desktop/electron/prompting/diagnostics.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts
- @contracts

## Main Exports
- buildChatExecutionDiagnostics
- buildChatExecutionDiagnostics
- BuildChatExecutionDiagnosticsInput
- buildRetrievedSourceSummary
- buildRetrievedSourceSummary
- BuildRetrievedSourceSummaryInput

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/diagnostics.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/diagnostics.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
