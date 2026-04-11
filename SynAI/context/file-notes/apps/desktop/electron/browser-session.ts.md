<!-- source-hash:db9f3e290a2aa60b4ddbb7d94871516a93de0d1bdb4ea767a3fedb806124c165; note-hash:b5589e60bf53cb91b44574da85528d21be0ffc7824f4f4f6a1fdfcf6d3189499 -->
# SynAI/apps/desktop/electron/browser-session.ts

## Path
SynAI/apps/desktop/electron/browser-session.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./browser-session-playwright
- electron
- node:path

## Main Exports
- createElectronWorkflowBrowserHost
- createElectronWorkflowBrowserHost
- WorkflowBrowserHost
- WorkflowBrowserResult

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/browser-session-playwright.ts
- SynAI/apps/desktop/electron/browser-session.js
- SynAI/tests/capability/browser-session.test.js
- SynAI/tests/capability/browser-session.test.ts

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
