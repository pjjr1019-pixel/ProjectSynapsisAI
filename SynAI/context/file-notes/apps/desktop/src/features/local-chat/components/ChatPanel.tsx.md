<!-- source-hash:f8bd996f2c0c70122eb6379e792ea3b27abb9ea07af1da724ce1810b1936235d; note-hash:4d8c508313f97345c88fa512a7be8c21c094219334f8f55060dce44c3c444043 -->
# SynAI/apps/desktop/src/features/local-chat/components/ChatPanel.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ChatPanel.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Button
- ../types/localChat.types
- ../utils/awarenessCards
- ./AwarenessCard
- ./ChatHeader
- ./ChatInputBar
- ./MessageList
- ./SmartPromptStatus

## Main Exports
- ChatPanel

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.tsx
- SynAI/apps/desktop/src/features/local-chat/components/ChatHeader.tsx
- SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.tsx
- SynAI/apps/desktop/src/features/local-chat/components/ChatPanel.js
- SynAI/apps/desktop/src/features/local-chat/components/MessageList.tsx
- SynAI/apps/desktop/src/features/local-chat/components/SmartPromptStatus.tsx
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/features/local-chat/utils/awarenessCards.ts

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
