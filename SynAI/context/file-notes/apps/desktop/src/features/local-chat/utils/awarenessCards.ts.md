<!-- source-hash:f08fa5472c4458a649a3cdda2b85eab6ef0888975bcce135d1ec6379e8b28f69; note-hash:a7b7fef978203a367d4914f51461f314b22963560f8ece1a28e00f35cd0c491b -->
# SynAI/apps/desktop/src/features/local-chat/utils/awarenessCards.ts

## Path
SynAI/apps/desktop/src/features/local-chat/utils/awarenessCards.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts

## Main Exports
- buildAwarenessMessageMetadata
- buildAwarenessMessageMetadata
- buildLiveAwarenessMessageMetadata
- buildLiveAwarenessMessageMetadata
- buildStartupDigestCard
- buildStartupDigestCard

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/utils/awarenessCards.js

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
