<!-- source-hash:0da6dc427a3c0d819c55494d921587bf875ae13d35ea06363f4675462235340b; note-hash:c6934ed1150c4bb81dfe4a743fe8a2c720564890fe65a0a75fb343f5e51dba8d -->
# SynAI/apps/desktop/src/features/local-chat/components/MessageItem.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/MessageItem.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../../../shared/utils/cn
- ../../../shared/utils/time
- ./AwarenessCard
- ./GroundingEvidenceView
- ./ReasoningTraceView
- @contracts

## Main Exports
- MessageItem

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.tsx
- SynAI/apps/desktop/src/features/local-chat/components/GroundingEvidenceView.tsx
- SynAI/apps/desktop/src/features/local-chat/components/MessageItem.js
- SynAI/apps/desktop/src/features/local-chat/components/ReasoningTraceView.tsx
- SynAI/apps/desktop/src/shared/components/Badge.tsx
- SynAI/apps/desktop/src/shared/utils/cn.ts
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
