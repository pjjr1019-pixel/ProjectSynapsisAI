<!-- source-hash:c05829d2560fd0e30b629da98459028ce18069774b71d9756fc9549a28a43a8f; note-hash:9035b0f636cb78c9f32b94f7b3f8a958194eb1fb2d886fb01cefe5f683b772ed -->
# SynAI/apps/desktop/src/features/local-chat/components/TurnPreview.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/TurnPreview.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/utils/time
- ../types/localChat.types
- react

## Main Exports
- TurnPreview

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/TurnPreview.js
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
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
