<!-- source-hash:82b2daf8d2c9d7d489464fb070a15c3d24e2c029002c5ec15c1303e6126bdbd1; note-hash:e5083bd39d036eb23f479de53e5279e57937f2bb2e6f5d582dfe43c6dd9e83ca -->
# SynAI/apps/desktop/src/features/memory/store/memoryStore.ts

## Path
SynAI/apps/desktop/src/features/memory/store/memoryStore.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../types/memory.types

## Main Exports
- memoryStore
- memoryStore

## Likely Side Effects
application state updates

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/store/memoryStore.js
- SynAI/apps/desktop/src/features/memory/types/memory.types.ts

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
