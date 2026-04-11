<!-- source-hash:856e0596ce587d76308d59a6b0f2c49b5e47e4f27f3f082e447f9dc08f8be655; note-hash:a0f83048cb10630e3dc2d8ca5a06e4df887cca2164641657407e32d7389f8cdd -->
# SynAI/apps/desktop/src/features/memory/hooks/useMemory.ts

## Path
SynAI/apps/desktop/src/features/memory/hooks/useMemory.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../store/memoryStore
- react

## Main Exports
- useMemory
- useMemory

## Likely Side Effects
application state updates

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/hooks/useMemory.js
- SynAI/apps/desktop/src/features/memory/store/memoryStore.ts

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
