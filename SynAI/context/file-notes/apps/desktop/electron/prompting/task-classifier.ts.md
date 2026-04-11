<!-- source-hash:a806ade7cae419c47b76595532922daade224c85d3ae35ad00397ec0bd909abd; note-hash:4c4dad58a4c48720c43f277b690d1d184eedc117b94fd6090928c02fb0852962 -->
# SynAI/apps/desktop/electron/prompting/task-classifier.ts

## Path
SynAI/apps/desktop/electron/prompting/task-classifier.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts

## Main Exports
- buildPolicyDiagnostics
- buildPolicyDiagnostics
- classifyPromptTask
- classifyPromptTask
- formatClassifierCategories
- formatClassifierCategories
- PromptTaskClassificationResult
- PromptTaskClassifierOptions

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/task-classifier.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/task-classifier.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
