<!-- source-hash:c5037806ecd48170611a871bd37dcc8d36eaa63963dc739d76786c3fdca8185b; note-hash:f64ac7eaeb9092afe737201706dc4e2e60bd410ad47988b7394b9df07b0b8763 -->
# SynAI/apps/desktop/electron/prompting/intent-contract.ts

## Path
SynAI/apps/desktop/electron/prompting/intent-contract.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./task-classifier
- @contracts

## Main Exports
- buildSeedPromptIntent
- buildSeedPromptIntent
- BuildSeedPromptIntentInput
- hasSimpleHumanStylePreference
- hasSimpleHumanStylePreference
- isExplicitWindowsAwarenessPrompt
- isExplicitWindowsAwarenessPrompt
- isGenericWritingPrompt

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/intent-contract.test.ts
- SynAI/apps/desktop/electron/prompting/task-classifier.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/intent-contract.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
