<!-- source-hash:fd5ee80285e21da59485fb0d99cbd7bcb6a35ce4ac04ded39de630adab3cff67; note-hash:c465e5a251240c39e5257678ae9d35b53b310af42f1b971c4744dd37263c37f2 -->
# SynAI/apps/desktop/src/features/local-chat/components/ConversationList.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ConversationList.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Button
- ../../../shared/components/Input
- ../../../shared/components/Panel
- ../../../shared/utils/time
- @contracts

## Main Exports
- ConversationList

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/ConversationList.js
- SynAI/apps/desktop/src/shared/components/Button.tsx
- SynAI/apps/desktop/src/shared/components/Input.tsx
- SynAI/apps/desktop/src/shared/components/Panel.tsx
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
