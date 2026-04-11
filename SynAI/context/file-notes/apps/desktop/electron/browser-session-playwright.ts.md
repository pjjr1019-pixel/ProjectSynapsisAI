<!-- source-hash:c4454d624f19080280d36706a8e3ec198f859cd0946661a8b4d11dd409e67e14; note-hash:91619d9db1021e866d7626b3e6acedc8a2c8ef05d445c78b077dbd4529e059a5 -->
# SynAI/apps/desktop/electron/browser-session-playwright.ts

## Path
SynAI/apps/desktop/electron/browser-session-playwright.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./browser-session
- node:fs/promises
- node:path
- playwright-core

## Main Exports
- createPlaywrightWorkflowBrowserHost
- createPlaywrightWorkflowBrowserHost

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/browser-session-playwright.js
- SynAI/apps/desktop/electron/browser-session.ts

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
