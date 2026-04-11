<!-- source-hash:2703a6ede595575f30080e1dd8aa917aaa9886240f210458ab8887f0a4fc0865; note-hash:36808897f05bef662c65d5220139daf443a01fca9c7d85573959c0e8beb4bc33 -->
# SynAI/apps/desktop/electron/prompting/synthesizer.ts

## Path
SynAI/apps/desktop/electron/prompting/synthesizer.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts

## Main Exports
- createSynthesisMessages
- createSynthesisMessages

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/synthesizer.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/synthesizer.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
