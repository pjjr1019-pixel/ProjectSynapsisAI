<!-- source-hash:a08c7b3fb62a706b73ac047c76654a24a8f4498356045af433fe30dda78c2409; note-hash:496cc0df2dfff0f1ec6a43afee1aa69f246860fb13f1d695b2a862f8f48447b7 -->
# SynAI/apps/desktop/electron/workflow-orchestrator.ts

## Path
SynAI/apps/desktop/electron/workflow-orchestrator.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./browser-session
- ./workflow-planner
- @contracts
- @governance-execution
- @governance-execution/approvals/queue
- @web-search
- electron
- node:fs/promises

## Main Exports
- createWorkflowOrchestrator
- createWorkflowOrchestrator
- WorkflowOrchestrator
- WorkflowOrchestratorOptions

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
governed execution state

## Related Files
- SynAI/apps/desktop/electron/browser-session.ts
- SynAI/apps/desktop/electron/workflow-orchestrator.js
- SynAI/apps/desktop/electron/workflow-planner.ts
- SynAI/tests/capability/workflow-orchestrator.test.js
- SynAI/tests/capability/workflow-orchestrator.test.ts

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
