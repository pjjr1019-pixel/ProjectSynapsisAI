<!-- source-hash:9c9a938afb828413b97d529fc480b8bd888313bc50a1cac4422a5d4668271e2e; note-hash:ce6fc7514ebac88cff762d813ca239d9bf32bbd44ad99027947c0f1cf4264fbd -->
# SynAI/apps/desktop/src/features/local-chat/utils/liveUsageReply.ts

## Path
SynAI/apps/desktop/src/features/local-chat/utils/liveUsageReply.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../../../../packages/Awareness-Reasoning/src/reasoning/resource-usage
- @contracts

## Main Exports
- buildLiveUsageMessageMetadata
- buildLiveUsageMessageMetadata
- formatLiveUsageReply
- formatLiveUsageReply
- isLiveUsageAnswer
- isLiveUsageAnswer
- LIVE_USAGE_REFRESH_MS
- LIVE_USAGE_REFRESH_MS

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/utils/liveUsageReply.js
- SynAI/packages/Awareness-Reasoning/src/reasoning/resource-usage.ts

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
