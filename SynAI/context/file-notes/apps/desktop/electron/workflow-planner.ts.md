<!-- source-hash:97c1793f84b7343b3cea5994a2faaefa24002cc73093ff2e9f4c4f08dc4cf5a3; note-hash:ad0e24979a767e2f369cb0caed1729c901545747cd326b208207f90fab8ace4a -->
# SynAI/apps/desktop/electron/workflow-planner.ts

## Path
SynAI/apps/desktop/electron/workflow-planner.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @awareness/target-knowledge
- @contracts
- node:crypto
- node:fs/promises
- node:path

## Main Exports
- buildWorkflowPlan
- buildWorkflowPlan
- WorkflowPlanningContext

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
governed execution state

## Related Files
- SynAI/apps/desktop/electron/workflow-planner.js
- SynAI/tests/capability/workflow-planner.test.js
- SynAI/tests/capability/workflow-planner.test.ts

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
