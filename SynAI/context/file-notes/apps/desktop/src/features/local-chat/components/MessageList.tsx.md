<!-- source-hash:c0455683202242051b51cb2e366f4fda56b8cd91d523a8cbf3dd2e27084eec0d; note-hash:703c0cee394080daac49454b9e9a9881f2389a8d16378d8d9caba4b7adc1b6a2 -->
# SynAI/apps/desktop/src/features/local-chat/components/MessageList.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/MessageList.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Button
- ../../../shared/utils/cn
- ./MessageItem
- @contracts
- @tanstack/react-virtual
- react

## Main Exports
- MessageList

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/MessageItem.tsx
- SynAI/apps/desktop/src/features/local-chat/components/MessageList.js
- SynAI/apps/desktop/src/shared/components/Button.tsx
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
