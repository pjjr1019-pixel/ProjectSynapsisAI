<!-- source-hash:b5bdac104e44d2623c9331089cecce67c9da78c6f45b76b99c3fc69ece08952b; note-hash:303206eea7ce757624201e3f8cbe10c4c0325f7254d44ab2b11b8014f7e24914 -->
# SynAI/apps/desktop/src/features/local-chat/utils/promptEvaluation.ts

## Path
SynAI/apps/desktop/src/features/local-chat/utils/promptEvaluation.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts

## Main Exports
- buildPromptEvaluationCases
- buildPromptEvaluationCases
- buildPromptEvaluationRequest
- buildPromptEvaluationRequest
- clonePromptEvaluationDraft
- clonePromptEvaluationDraft
- defaultPromptEvaluationDraft
- defaultPromptEvaluationDraft

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/utils/promptEvaluation.js

## Edit Risk
medium

## Edit Guidance
Keep renderer changes narrow and avoid changing governed semantics in UI-only code.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
