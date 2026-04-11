<!-- source-hash:271be9405cc7b43a574619b3edcbf8eb036501ff9709c86b0cc137bf56645681; note-hash:a32f496b3cd351d22806dd203acd711d3741818ca5347057e71155113120aeec -->
# SynAI/apps/desktop/electron/agent-runtime-adapters.ts

## Path
SynAI/apps/desktop/electron/agent-runtime-adapters.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./desktop-actions
- ./workflow-orchestrator
- @agent-runtime/contracts
- @agent-runtime/core
- @agent-runtime/executor
- @contracts
- @governance-execution/execution/windows-action-catalog

## Main Exports
- createDesktopActionRuntimeAdapter
- createDesktopActionRuntimeAdapter
- createWorkflowRuntimeAdapter
- createWorkflowRuntimeAdapter

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/agent-runtime-adapters.js
- SynAI/apps/desktop/electron/desktop-actions.ts
- SynAI/apps/desktop/electron/workflow-orchestrator.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts

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
