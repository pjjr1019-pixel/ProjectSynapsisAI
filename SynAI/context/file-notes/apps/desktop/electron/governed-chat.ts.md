<!-- source-hash:fec08a6c8348743c5111e5cf9da8e87475a3ff7260f3148a7772fb7341c5551c; note-hash:99f0d66dce5a7a37bf379f00146b2e2fa76c898d597f4839699984a664dec32f -->
# SynAI/apps/desktop/electron/governed-chat.ts

## Path
SynAI/apps/desktop/electron/governed-chat.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./desktop-actions
- ./workflow-orchestrator
- @awareness/governance-history/miner
- @awareness/governance-history/replay-envelope
- @contracts
- @governance-execution/approvals/queue
- @governance-execution/governed-chat/gap-classifier
- @governance-execution/governed-chat/remediation

## Main Exports
- createGovernedChatService
- createGovernedChatService
- GovernedChatTurnInput
- GovernedChatTurnOutput

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
governed execution state

## Related Files
- SynAI/apps/desktop/electron/desktop-actions.ts
- SynAI/apps/desktop/electron/governed-chat.js
- SynAI/apps/desktop/electron/workflow-orchestrator.ts
- SynAI/tests/capability/governed-chat-router.test.js
- SynAI/tests/capability/governed-chat-router.test.ts
- SynAI/tests/capability/governed-chat-service.test.js
- SynAI/tests/capability/governed-chat-service.test.ts

## Edit Risk
high

## Edit Guidance
Keep semantics explicit, preserve approvals/clarification details, and run focused capability tests.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
