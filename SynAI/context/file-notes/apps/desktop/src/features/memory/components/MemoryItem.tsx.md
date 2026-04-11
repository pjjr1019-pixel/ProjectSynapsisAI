<!-- source-hash:c12040beca3616ca32b2d8d65f2a2b117b094a2fd6bfcc7cd67def9f755e3e6d; note-hash:0a0f14d85c400ea90f44c920ee1935d3632baf9c224a730d4e5fd7717ad2fb5c -->
# SynAI/apps/desktop/src/features/memory/components/MemoryItem.tsx

## Path
SynAI/apps/desktop/src/features/memory/components/MemoryItem.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Button
- @contracts

## Main Exports
- MemoryItem

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/components/MemoryItem.js
- SynAI/apps/desktop/src/shared/components/Button.tsx

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
