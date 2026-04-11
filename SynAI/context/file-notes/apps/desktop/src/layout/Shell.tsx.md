<!-- source-hash:86a97a4e70597a4f11ece54c9c8fd77d5ef2cbb4a608557cd6efc3bbb7feeee1; note-hash:4888b0a5416e1e8a89d52ab67dde5fed5617a3445bb0b2565a93e0c864f7138d -->
# SynAI/apps/desktop/src/layout/Shell.tsx

## Path
SynAI/apps/desktop/src/layout/Shell.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ./StatusBar
- ./TopBar
- @contracts
- react

## Main Exports
- Shell

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/src/layout/Shell.js
- SynAI/apps/desktop/src/layout/StatusBar.tsx
- SynAI/apps/desktop/src/layout/TopBar.tsx

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
