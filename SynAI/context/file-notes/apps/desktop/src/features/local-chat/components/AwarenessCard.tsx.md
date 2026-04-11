<!-- source-hash:f2481ea2da6b7490d9fa51b564f403a14d558cf4894ff36788630ee104794975; note-hash:7d7432e68529eb93157cea4852e6f7ccdfac008d2f930e332036004fa5ca5397 -->
# SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/utils/cn
- @contracts

## Main Exports
- AwarenessCard

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.js
- SynAI/apps/desktop/src/shared/utils/cn.ts

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
