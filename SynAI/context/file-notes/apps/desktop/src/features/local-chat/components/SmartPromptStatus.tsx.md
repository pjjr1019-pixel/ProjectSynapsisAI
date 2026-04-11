<!-- source-hash:01ac0e0749280d91720c55aea43202a600cde0a0d28f44796bd4997abeb3929b; note-hash:7ecbfcf0da383fa16a2214a177edd92f9bca841872c15df03957681ae724b9e9 -->
# SynAI/apps/desktop/src/features/local-chat/components/SmartPromptStatus.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/SmartPromptStatus.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../utils/promptAssembler
- @contracts

## Main Exports
- SmartPromptStatus

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/SmartPromptStatus.js
- SynAI/apps/desktop/src/features/local-chat/utils/promptAssembler.ts
- SynAI/apps/desktop/src/shared/components/Badge.tsx

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
