<!-- source-hash:21df9972a45b04411085879725264eda4f833293cbd7dfb4f58da3dbb51d4498; note-hash:a603780feaad6d53ca50c9c079be8f4ea643b9366e3c231ef0883dc591b80314 -->
# SynAI/apps/desktop/electron/prompting/reasoning-profile.ts

## Path
SynAI/apps/desktop/electron/prompting/reasoning-profile.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./task-classifier
- @contracts
- @contracts

## Main Exports
- getReasoningProfileBehavior
- getReasoningProfileBehavior
- normalizePlanningPolicy
- normalizePlanningPolicy
- normalizeReasoningProfile
- normalizeReasoningProfile
- ReasoningProfileBehavior
- resolveAwarenessRouting

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/task-classifier.ts

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
