<!-- source-hash:856964c51b9d4299210f12e32e4a289ccdfe74fcd94eac23b02b926a88005bd9; note-hash:9ecca833ef2aa5fc76532e61eccc9df67674f495d8b07e9f1d45b2c8296b910c -->
# SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.ts

## Path
SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./task-classifier
- @agent-runtime/contracts
- @agent-runtime/contracts/prompt-intent-bridge.contracts
- @contracts

## Main Exports
- attachPromptIntentBridgeToTask
- attachPromptIntentBridgeToTask
- buildPromptIntentRuntimeBridge
- buildPromptIntentRuntimeBridge
- isAmbiguousFirstTimeTaskPrompt
- isAmbiguousFirstTimeTaskPrompt
- shouldPersistResolvedPromptPattern
- shouldPersistResolvedPromptPattern

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.test.ts
- SynAI/apps/desktop/electron/prompting/task-classifier.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
