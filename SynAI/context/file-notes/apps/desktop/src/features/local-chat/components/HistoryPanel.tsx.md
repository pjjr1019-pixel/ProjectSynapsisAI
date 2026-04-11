<!-- source-hash:663a1f0629a12b00c2206fb35f868cb6f641ae2600ba23b774aa10d2ce7771fc; note-hash:031d69d11618eb284ffc6fa01d13ee23acaa7629c61f643da289471f0260e1bf -->
# SynAI/apps/desktop/src/features/local-chat/components/HistoryPanel.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/HistoryPanel.tsx

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
- ../types/localChat.types
- ./TurnPreview
- @contracts

## Main Exports
- HistoryPanel

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/HistoryPanel.js
- SynAI/apps/desktop/src/features/local-chat/components/TurnPreview.tsx
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/shared/components/Button.tsx
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/components/Input.tsx

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
