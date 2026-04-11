<!-- source-hash:5ecd779344bf4ddd4b2acebbb15c95dc2e5753e36a3b10fc714f1418be79a39c; note-hash:a0ae7d9868207af3ee7b78ed9a191abed6983fa24fcb86c4a9af56975338989f -->
# SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./awareness
- ./grounding
- ./health
- ./memory
- ./prompt-intent
- ./rag
- ./reasoning-profile

## Main Exports
- BackgroundSyncEvent
- CHAT_GOVERNED_TASK_DECISIONS
- CHAT_GOVERNED_TASK_DECISIONS
- CHAT_GOVERNED_TASK_EXECUTORS
- CHAT_GOVERNED_TASK_EXECUTORS
- CHAT_GOVERNED_TASK_RISK_TIERS
- CHAT_GOVERNED_TASK_RISK_TIERS
- CHAT_REPLY_CLASSIFIER_CATEGORIES

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.js
- SynAI/packages/Awareness-Reasoning/src/contracts/grounding.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/health.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/rag.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/reasoning-profile.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.js
