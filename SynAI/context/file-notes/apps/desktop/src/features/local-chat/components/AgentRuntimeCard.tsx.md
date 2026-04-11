<!-- source-hash:412cf643669acf1d82c994f8251e22f81940b7d110b48e85ed9e02c350fbb8bb; note-hash:e47e861661eac4326ab983b398caa6b897abb76e3ed0682aba4e7196aabfc47f -->
# SynAI/apps/desktop/src/features/local-chat/components/AgentRuntimeCard.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/AgentRuntimeCard.tsx

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
- ../../../shared/utils/time
- @contracts
- react

## Main Exports
- AgentRuntimeCard

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/AgentRuntimeCard.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx
- SynAI/apps/desktop/src/shared/components/Button.tsx
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/components/Input.tsx
- SynAI/apps/desktop/src/shared/components/Textarea.tsx
- SynAI/apps/desktop/src/shared/utils/time.ts

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
