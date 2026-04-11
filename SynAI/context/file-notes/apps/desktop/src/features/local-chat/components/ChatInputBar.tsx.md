<!-- source-hash:0506be671260b34f25007a657d4605c87e466f98b09ebd534391fab6c5707131; note-hash:3023b907660d1b4ce20f9e3fdec9a0bcdc3684fd063df4c6a05bd2644006cece -->
# SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Button
- ../../../shared/components/Textarea
- ../hooks/useLocalChat
- ../types/localChat.types
- @contracts
- react

## Main Exports
- ChatInputBar

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.js
- SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChat.ts
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/shared/components/Button.tsx
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
