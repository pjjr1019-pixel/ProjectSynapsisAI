<!-- source-hash:f7957115a89510b2c0afbeec232d32fd3a42049f9edabf7d50108e083811171a; note-hash:6c1a6d9380d6ab7f5a9eff30cba99b8fd9965271dca113de44108f42e7494e87 -->
# SynAI/apps/desktop/src/features/memory/components/MemorySearch.tsx

## Path
SynAI/apps/desktop/src/features/memory/components/MemorySearch.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Input

## Main Exports
- MemorySearch

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/apps/desktop/src/features/memory/components/MemorySearch.js
- SynAI/apps/desktop/src/shared/components/Input.tsx

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
