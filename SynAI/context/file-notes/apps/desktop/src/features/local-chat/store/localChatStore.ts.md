<!-- source-hash:fdb4752f2aef7ad1b6ada652263586c2e691b62e1a77b87d5b03f1d394662445; note-hash:b1d2dfda7cfd8c506e6e4ad40e999a34b1003e524b6984f8d67a26de0550966e -->
# SynAI/apps/desktop/src/features/local-chat/store/localChatStore.ts

## Path
SynAI/apps/desktop/src/features/local-chat/store/localChatStore.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../types/localChat.types

## Main Exports
- localChatStore
- localChatStore

## Likely Side Effects
application state updates

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/store/localChatStore.js
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
