<!-- source-hash:fd7a74403ec672c5a5842974ae7a24578ec342bfbbcd5066e127b167f35a4f30; note-hash:5fbf0532736636040d2d1bafdef0a32106c0fb2860a65111ca382936a73f84fc -->
# SynAI/apps/desktop/src/main.tsx

## Path
SynAI/apps/desktop/src/main.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ./App
- ./styles.css
- react
- react-dom/client

## Main Exports
- none

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/main.prompting-delegation.test.ts
- SynAI/apps/desktop/src/App.tsx
- SynAI/apps/desktop/src/main.js
- SynAI/apps/desktop/src/styles.css

## Edit Risk
medium

## Edit Guidance
Keep renderer changes narrow and avoid changing governed semantics in UI-only code.

## Likely Tests Affected
- SynAI/apps/desktop/electron/main.prompting-delegation.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
