<!-- source-hash:1714d7fe3e9270150f5872a73c6033137d8172da684875a494a9b6fed86cf7e9; note-hash:b56982603657fd390b3398d6aaaea7116b5d5278d8f39e9e90154fc297bfcd9a -->
# SynAI/packages/Awareness-Reasoning/src/contracts/health.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/health.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./awareness

## Main Exports
- AppHealth
- AwarenessRuntimeHealth
- HealthStatus
- ModelHealth

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/health.js
- SynAI/tests/smoke/local-ai-health.smoke.test.js
- SynAI/tests/smoke/local-ai-health.smoke.test.ts

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
