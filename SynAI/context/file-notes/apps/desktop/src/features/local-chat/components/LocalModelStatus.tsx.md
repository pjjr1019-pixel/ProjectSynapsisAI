<!-- source-hash:8aa2f89cd57e0c34f5503848b72c660931beef4b1639861aabad5e1c59054d7a; note-hash:b025725c9b8927fd628079f0da95592704b8e8e63f2a997fd5c6a8510a82f790 -->
# SynAI/apps/desktop/src/features/local-chat/components/LocalModelStatus.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/LocalModelStatus.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../../../shared/components/Card
- ../../../shared/utils/time
- @contracts

## Main Exports
- LocalModelStatus

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/LocalModelStatus.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/utils/time.ts

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
