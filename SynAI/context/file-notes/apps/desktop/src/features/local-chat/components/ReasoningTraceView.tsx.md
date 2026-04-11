<!-- source-hash:3950519f9f5208691e6db8162df5f1a58bf69c1a96c460feb250965b7d3326d8; note-hash:539e44be1c6c89b018ad5e2c294a971b0fb2b7d8abf5889f5a41ebefc78052cd -->
# SynAI/apps/desktop/src/features/local-chat/components/ReasoningTraceView.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ReasoningTraceView.tsx

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
- ReasoningTraceView

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/components/ReasoningTraceView.js
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
