<!-- source-hash:abb08bbe73232e8bd4c74fafb19fd3b2f139653a9f8aeb7f0a4187283ad20cec; note-hash:ca5ed04b6c6579ad33dfe3e777de3b829845687c954b0589af2df25b8683dc97 -->
# SynAI/apps/desktop/electron/prompting/instruction-builders.ts

## Path
SynAI/apps/desktop/electron/prompting/instruction-builders.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts

## Main Exports
- applyPromptPolicies
- applyPromptPolicies
- awarenessAnswerModeInstruction
- awarenessAnswerModeInstruction
- buildPromptIntentInstruction
- buildPromptIntentInstruction
- planningPolicyInstruction
- planningPolicyInstruction

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/instruction-builders.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/instruction-builders.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
