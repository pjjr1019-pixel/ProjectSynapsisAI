<!-- source-hash:410f47459c490a80b701e8e1e09f2becb694c3bff0ea13cbec4491bd22916710; note-hash:9a9368ababe9e865274fe0c0a1de76b5a58aa07cc950dec0113ae9f27ae1d3bb -->
# SynAI/apps/desktop/src/features/local-chat/components/MemoryInspector.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/MemoryInspector.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Card
- ../../../shared/utils/cn
- @contracts

## Main Exports
- MemoryInspector

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/MemoryInspector.js
- SynAI/apps/desktop/src/shared/components/Card.tsx
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
