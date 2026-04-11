<!-- source-hash:a793f187085c82cb0c7b6a86fbdd40c3f82239adfa140340a5f5d8ae0fd7814f; note-hash:89344b19402ee51e29e22b88917938525c4cce9adf806b8746907a11e0d6467c -->
# SynAI/apps/desktop/src/features/local-chat/components/PromptEvaluationCard.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/PromptEvaluationCard.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Button
- ../../../shared/components/Card
- ../../../shared/components/Input
- ../../../shared/components/Textarea
- ../types/localChat.types
- ../utils/promptEvaluation
- @contracts
- react

## Main Exports
- PromptEvaluationCard

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/PromptEvaluationCard.js
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/features/local-chat/utils/promptEvaluation.ts
- SynAI/apps/desktop/src/shared/components/Button.tsx
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/components/Input.tsx
- SynAI/apps/desktop/src/shared/components/Textarea.tsx

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
