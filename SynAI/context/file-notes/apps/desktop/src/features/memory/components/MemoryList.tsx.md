<!-- source-hash:c786e65614702eda3c65016e369c22f2ffee3b0f0f1aa5653d441566d4af2e9c; note-hash:c135cfbe354247e3821684ac330ceefec1bfe9f523ef574e3df84b22111cbadb -->
# SynAI/apps/desktop/src/features/memory/components/MemoryList.tsx

## Path
SynAI/apps/desktop/src/features/memory/components/MemoryList.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ./MemoryItem
- @contracts

## Main Exports
- MemoryList

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/components/MemoryItem.tsx
- SynAI/apps/desktop/src/features/memory/components/MemoryList.js

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
