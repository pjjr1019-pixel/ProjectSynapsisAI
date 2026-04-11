<!-- source-hash:6c328afc1ffb29d621cf2d4cdc5fc6cbee43e0330f55f718849e36394660a0b3; note-hash:f4807f4bb07635ad7de2e7d3a9ea326d327a2e89ff694419386dd41332192256 -->
# SynAI/apps/desktop/src/features/local-chat/components/DesktopActionsCard.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/DesktopActionsCard.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../../../shared/components/Button
- ../../../shared/components/Card
- ../../../shared/components/Input
- ../../../shared/components/Textarea
- @contracts
- @governance-execution/execution/windows-action-catalog
- react

## Main Exports
- DesktopActionsCard

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/DesktopActionsCard.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx
- SynAI/apps/desktop/src/shared/components/Button.tsx
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/components/Input.tsx
- SynAI/apps/desktop/src/shared/components/Textarea.tsx

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
