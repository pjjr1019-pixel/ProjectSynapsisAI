<!-- source-hash:71b766a8e4b3e62f9c800e869d68b361e0a64ccc432b3b67ad60771ed6a6c74e; note-hash:e5d3ec5be7b6e229ad6c29eaf86498f3ba9f785e2423acf5f23dd78389d3f78a -->
# SynAI/apps/desktop/src/features/local-chat/components/ChatSettings.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ChatSettings.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Card
- ../../../shared/utils/cn
- ../types/localChat.types

## Main Exports
- ChatSettings

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/ChatSettings.js
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/shared/components/Card.tsx
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
