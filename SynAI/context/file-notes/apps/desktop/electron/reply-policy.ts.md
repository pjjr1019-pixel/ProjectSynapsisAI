<!-- source-hash:389dffc6b9d65745f2d77d90c765cc8f4a1f97cdaa88fd0d056c4cc9e34b4cc6; note-hash:f95130ace8c9e587bac72cc56aec376ea6d4b3d9973dcfd2e12b34fdee65944c -->
# SynAI/apps/desktop/electron/reply-policy.ts

## Path
SynAI/apps/desktop/electron/reply-policy.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./prompting/policy-matrix
- ./prompting/task-classifier
- @contracts
- node:path

## Main Exports
- filterWorkspaceHitsForReplyPolicy
- filterWorkspaceHitsForReplyPolicy
- getReplyPolicyDiagnostics
- getReplyPolicyDiagnostics
- getRoutingSuppressionReason
- getRoutingSuppressionReason
- inferReplyFormatPolicy
- inferReplyFormatPolicy

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/policy-matrix.ts
- SynAI/apps/desktop/electron/prompting/task-classifier.ts
- SynAI/apps/desktop/electron/reply-policy.js
- SynAI/apps/desktop/electron/reply-policy.test.js
- SynAI/apps/desktop/electron/reply-policy.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/reply-policy.test.js
- SynAI/apps/desktop/electron/reply-policy.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
