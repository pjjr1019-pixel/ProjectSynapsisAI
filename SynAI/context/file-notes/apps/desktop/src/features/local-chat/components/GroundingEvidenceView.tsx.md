<!-- source-hash:74257a25eae6a3974fe602645fc0627083cb203aab9d908bdafe6480bf011e86; note-hash:c143971854fbbe41782d76394e2922efd56e8c644fa0c912fb71f55dbac90c69 -->
# SynAI/apps/desktop/src/features/local-chat/components/GroundingEvidenceView.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/GroundingEvidenceView.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../../../shared/utils/time
- @contracts

## Main Exports
- GroundingEvidenceView

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/GroundingEvidenceView.js
- SynAI/apps/desktop/src/shared/components/Badge.tsx
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
