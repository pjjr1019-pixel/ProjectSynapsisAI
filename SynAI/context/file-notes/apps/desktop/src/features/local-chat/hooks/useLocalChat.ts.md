<!-- source-hash:5b9bfc2c635b6865750ac607249f5012b6fa7d6bed5651d5772955913c178b68; note-hash:4e4a4b74571560731936b23403ee20c6ac24e7f169320b26868a29cdd43d4390 -->
# SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChat.ts

## Path
SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChat.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/utils/time
- ../store/localChatStore
- ../types/localChat.types
- ../utils/liveUsageReply
- @contracts
- react

## Main Exports
- SendMessageOptions
- useLocalChat
- useLocalChat

## Likely Side Effects
application state updates

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChat.js
- SynAI/apps/desktop/src/features/local-chat/store/localChatStore.ts
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/features/local-chat/utils/liveUsageReply.ts
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
