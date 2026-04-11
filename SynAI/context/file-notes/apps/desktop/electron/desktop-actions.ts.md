<!-- source-hash:999d0ac1ae57e52ba75bfa4388e5a02a4eeeb434320403d86ac58cd65e6234b1; note-hash:e702917556d5910aa13aaa58ac615434c5811111934525b7cc8aa93c588f427a -->
# SynAI/apps/desktop/electron/desktop-actions.ts

## Path
SynAI/apps/desktop/electron/desktop-actions.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts
- @governance-execution
- @governance-execution/approvals/queue
- @governance-execution/execution/windows-action-catalog
- node:child_process
- node:fs/promises
- node:path

## Main Exports
- createDesktopActionService
- createDesktopActionService
- createWindowsDesktopActionHost
- createWindowsDesktopActionHost
- DesktopActionHost
- DesktopActionService
- DesktopActionServiceOptions
- resolveDefaultDesktopActionPaths

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
governed execution state

## Related Files
- SynAI/apps/desktop/electron/desktop-actions.js
- SynAI/tests/capability/desktop-actions-clarification.test.js
- SynAI/tests/capability/desktop-actions-clarification.test.ts
- SynAI/tests/capability/desktop-actions.test.js
- SynAI/tests/capability/desktop-actions.test.ts
- SynAI/tests/smoke/desktop-actions-card.smoke.test.tsx

## Edit Risk
high

## Edit Guidance
Keep semantics explicit, preserve approvals/clarification details, and run focused capability tests.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
