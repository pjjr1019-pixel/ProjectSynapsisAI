<!-- source-hash:6dcf8c1ef8619c7dd80fc52852558679ae1186cd0e8efbc945eb94f2ccc6622e; note-hash:71003041015d8b033f226b8fcae1ddd4788042065eb90712bb4fb9b7d181db2e -->
# SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- none

## Main Exports
- CAPABILITY_CASE_STATUSES
- CAPABILITY_CASE_STATUSES
- CAPABILITY_CATALOG_STATUSES
- CAPABILITY_CATALOG_STATUSES
- CAPABILITY_RUN_STATUSES
- CAPABILITY_RUN_STATUSES
- CAPABILITY_RUNNER_DOMAINS
- CAPABILITY_RUNNER_DOMAINS

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- none identified

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
