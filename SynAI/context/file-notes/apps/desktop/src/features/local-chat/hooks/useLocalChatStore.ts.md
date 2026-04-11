<!-- source-hash:e3ea715459cb94bc482b5df2fef031f77478de19a3daefea90ffcc3df066e46d; note-hash:6879736340a6e3827c3c60cd65ae578e8aeb926e3add915ed12eb5187eede87f -->
# SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChatStore.ts

## Path
SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChatStore.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../store/localChatStore
- ../types/localChat.types
- react
- react

## Main Exports
- useLocalChatStore
- useLocalChatStore

## Likely Side Effects
application state updates

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChatStore.js
- SynAI/apps/desktop/src/features/local-chat/store/localChatStore.ts
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts

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
