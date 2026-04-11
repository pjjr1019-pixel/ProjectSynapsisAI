<!-- source-hash:a68e3ae0ec0312a13a68a16a56b2b84bfaa3ef497709350c78511fc678943943; note-hash:6f48ece343f625758122a62a693f4f44a82e91e617de9d4553e0f004feb6b3a5 -->
# SynAI/apps/desktop/electron/prompting/planner.ts

## Path
SynAI/apps/desktop/electron/prompting/planner.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./intent-contract
- @contracts

## Main Exports
- createPromptIntentPlanningMessages
- createPromptIntentPlanningMessages
- parsePromptIntentPlannerResponse
- parsePromptIntentPlannerResponse
- planPromptIntent
- planPromptIntent
- PromptIntentPlannerInput
- PromptIntentPlannerOptions

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/intent-contract.ts
- SynAI/apps/desktop/electron/prompting/planner.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/tests/capability/remediation-planner.test.js
- SynAI/tests/capability/remediation-planner.test.ts
- SynAI/tests/capability/workflow-planner.test.js
- SynAI/tests/capability/workflow-planner.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/planner.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
