<!-- source-hash:1dccd57ceb0549d5be5e7bd9b994727e358de9b0db57684cf711e721f4e73759; note-hash:b0beeb874529a646eb69edf7a5b5621b40a2c9864fe84d34da8eaf6091cbe490 -->
# SynAI/apps/desktop/src/features/local-chat/components/ContextPreview.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ContextPreview.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Card
- ../../../shared/utils/cn
- ../../../shared/utils/time
- @contracts

## Main Exports
- ContextPreview

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/ContextPreview.js
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/utils/cn.ts
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
