<!-- source-hash:5103df068bfa9f8361d8bee45750ab627b568ddca7e0976aee56930a168c82a6; note-hash:a02752360968050ce53a51db98cc109979e098ad9211395745c08fc2952ea059 -->
# SynAI/apps/desktop/src/features/memory/types/memory.types.ts

## Path
SynAI/apps/desktop/src/features/memory/types/memory.types.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts

## Main Exports
- MemoryState

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/types/memory.types.js

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
