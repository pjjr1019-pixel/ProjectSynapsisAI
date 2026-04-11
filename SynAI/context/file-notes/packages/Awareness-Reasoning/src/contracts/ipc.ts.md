<!-- source-hash:7c0cd4ea19531aac667647a33d138ed2f596496e1781cd430a7aea4acb1810a8; note-hash:12ca87eac2be44aea68da6f2e29bd4cd109f02e5095b71817ea2d12f3c0d27b2 -->
# SynAI/packages/Awareness-Reasoning/src/contracts/ipc.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/ipc.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../official-knowledge
- ./awareness
- ./capability-runner
- ./chat
- ./health
- ./memory
- ./prompt-eval
- ./rag

## Main Exports
- ACTION_SCOPES
- ACTION_SCOPES
- ActionScope
- ApprovalToken
- CapabilityRegistryEntry
- CapabilityRegistrySnapshot
- DESKTOP_ACTION_KINDS
- DESKTOP_ACTION_KINDS

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/apps/desktop/electron/ipc-registration.test.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/health.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/ipc.js
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-eval.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/apps/desktop/electron/ipc-registration.test.ts
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
