<!-- source-hash:e831d2ca97700a63742674474436227579bdc182f8bbff886e290ae2eef8e10c; note-hash:a18f70d9ba95f4a6285d6b0b414eb66c70adfa8c8c634c0cad1ef481af5b67a1 -->
# SynAI/apps/desktop/src/features/local-chat/components/WorkflowOrchestrationCard.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/WorkflowOrchestrationCard.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../../../shared/components/Button
- ../../../shared/components/Card
- ../../../shared/components/Input
- ../../../shared/components/Textarea
- @contracts
- react

## Main Exports
- WorkflowOrchestrationCard

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/WorkflowOrchestrationCard.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx
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
