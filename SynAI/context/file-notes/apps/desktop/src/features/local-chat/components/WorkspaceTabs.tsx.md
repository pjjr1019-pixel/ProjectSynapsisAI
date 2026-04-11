<!-- source-hash:45a1b1574012e67a7fa2005e94b23b2c31d47e8dfe5c3bbb177df19c402885dd; note-hash:5549adf1f44dee6d29298348c068d3ad97b7bc254be737cb65ab11e1a33294bd -->
# SynAI/apps/desktop/src/features/local-chat/components/WorkspaceTabs.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/WorkspaceTabs.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/utils/cn
- ../types/localChat.types

## Main Exports
- WorkspaceTabs

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/WorkspaceTabs.js
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/shared/utils/cn.ts

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
