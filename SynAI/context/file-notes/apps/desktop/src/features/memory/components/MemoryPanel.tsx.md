<!-- source-hash:c9e4dbe8489d9fd103d12362ba5c5d36453303fe66d1c05dec61b9ff69b10172; note-hash:0a177e6cbf7f9763b082d12a0ec1c897a5f2a70f2fd1969198bc18beb4e282cd -->
# SynAI/apps/desktop/src/features/memory/components/MemoryPanel.tsx

## Path
SynAI/apps/desktop/src/features/memory/components/MemoryPanel.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Card
- ../../../shared/utils/cn
- ../hooks/useMemory
- ./MemoryList
- ./MemorySearch

## Main Exports
- MemoryPanel

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/components/MemoryList.tsx
- SynAI/apps/desktop/src/features/memory/components/MemoryPanel.js
- SynAI/apps/desktop/src/features/memory/components/MemorySearch.tsx
- SynAI/apps/desktop/src/features/memory/hooks/useMemory.ts
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
