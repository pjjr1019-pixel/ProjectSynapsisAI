<!-- source-hash:acd02cfaacf017618eaa6b2f684026d89f50301d888c8aab60ed40fb54be4bd9; note-hash:52870f0316c9429205833ae0093be8e693cf7fb70194001968843907c22f6a82 -->
# SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts

## Path
SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts

## Main Exports
- ChatSettingsState
- ConversationTurn
- HealthCheckState
- LocalChatState
- WorkspaceTab
- WorkspaceToolTab

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.js

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
