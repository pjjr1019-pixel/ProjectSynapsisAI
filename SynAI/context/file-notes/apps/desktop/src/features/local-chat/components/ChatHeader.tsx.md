<!-- source-hash:b874ac8dc2fbbace730e9afea0033ccc12fa5fb26d45106e2c405ca891066b9a; note-hash:fe6b4962a63252e007a0aeb8e72b477634f1ee5ad1080ec1f2a6f4fb87af5241 -->
# SynAI/apps/desktop/src/features/local-chat/components/ChatHeader.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ChatHeader.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- @contracts

## Main Exports
- ChatHeader

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/ChatHeader.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx

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
