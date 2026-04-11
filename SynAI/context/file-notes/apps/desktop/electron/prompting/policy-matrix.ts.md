<!-- source-hash:3a2a02cb84a716e547dd23e00ff76464413da7ac9b0509b655f8e7ef449098cf; note-hash:2a8325b8a14285d9f120aa923f58b4cd6b81c63a70e1a0905bddbd684888c1d6 -->
# SynAI/apps/desktop/electron/prompting/policy-matrix.ts

## Path
SynAI/apps/desktop/electron/prompting/policy-matrix.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./reasoning-profile
- ./task-classifier
- @contracts

## Main Exports
- deriveReplyPolicy
- deriveReplyPolicy
- DeriveReplyPolicyOptions
- deriveRoutingSuppressionReasons
- deriveRoutingSuppressionReasons

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/policy-matrix.test.ts
- SynAI/apps/desktop/electron/prompting/reasoning-profile.ts
- SynAI/apps/desktop/electron/prompting/task-classifier.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/policy-matrix.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
