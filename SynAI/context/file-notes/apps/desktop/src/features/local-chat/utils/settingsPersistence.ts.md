<!-- source-hash:395eb0b032b3ba35b965d76f3fbd3eb894d62daae83ac37149d1acc6941bd1c6; note-hash:af586383d56ec589358d6237aca1777bb4d6143d3ca59123495644547c229fb5 -->
# SynAI/apps/desktop/src/features/local-chat/utils/settingsPersistence.ts

## Path
SynAI/apps/desktop/src/features/local-chat/utils/settingsPersistence.ts

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
- defaultChatSettings
- defaultChatSettings
- hydrateChatSettings
- hydrateChatSettings
- loadPersistedChatSettings
- loadPersistedChatSettings
- persistChatSettings
- persistChatSettings

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
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
