<!-- source-hash:aef3001531682129bd2cdb6c59fb13dd419950d72c44ec716ae2152232ee369b; note-hash:967441d4fa761445d94490b8c1ca86f6f86e01d13f223bc2918815ad6a3d879d -->
# SynAI/apps/desktop/src/features/local-chat/hooks/useConversationSearch.ts

## Path
SynAI/apps/desktop/src/features/local-chat/hooks/useConversationSearch.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts
- react

## Main Exports
- useConversationSearch
- useConversationSearch

## Likely Side Effects
application state updates

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/hooks/useConversationSearch.js

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
