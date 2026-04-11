<!-- source-hash:62afdb635d295bf99ad10e06a841ed2d6307543c28afe05da77e57f614163b6b; note-hash:d218c91f464200c6567c2add2de3d766bfee7345e3975686ded97746cd639f25 -->
# SynAI/apps/desktop/src/features/local-chat/utils/conversationTurns.ts

## Path
SynAI/apps/desktop/src/features/local-chat/utils/conversationTurns.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../types/localChat.types
- @contracts

## Main Exports
- buildConversationTurns
- buildConversationTurns
- getLatestConversationTurn
- getLatestConversationTurn

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/features/local-chat/utils/conversationTurns.js

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
