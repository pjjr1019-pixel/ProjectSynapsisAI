<!-- source-hash:12f3c0f5af0b9d5753be1e2538b36444d46a1a2a5f22c07fad5812f4348f2ece; note-hash:fc1e49aa98d55355e2ab7d013eb2b96dff63db721ffe34f679ff42ea026537a3 -->
# SynAI/apps/desktop/src/layout/Sidebar.tsx

## Path
SynAI/apps/desktop/src/layout/Sidebar.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../features/feature-registry
- ../shared/components/Badge
- ../shared/components/CompactSection
- react

## Main Exports
- Sidebar

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/src/features/feature-registry.ts
- SynAI/apps/desktop/src/layout/Sidebar.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx
- SynAI/apps/desktop/src/shared/components/CompactSection.tsx

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
