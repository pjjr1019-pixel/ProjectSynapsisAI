<!-- source-hash:5ea1e52c19b0ef5e72cbd61c8259b708579be6fd9e40ae7d881cd5113721e7a6; note-hash:28d2a7df035ad068e4ea0804a08af3fc71fca8d1cbe942023e4e1cd8f48f5c15 -->
# SynAI/apps/desktop/src/layout/TopBar.tsx

## Path
SynAI/apps/desktop/src/layout/TopBar.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../shared/components/Badge
- @contracts

## Main Exports
- TopBar

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/src/layout/TopBar.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx

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
