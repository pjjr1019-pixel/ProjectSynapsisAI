<!-- source-hash:e6a70a7736b9d4206e96d83670cd1d04e9988244da4e5e2a4a55788759ba1df6; note-hash:0c686e087860faf0de2d35eeb5073775b07e5386fac42298b3e3a846554b7e75 -->
# SynAI/packages/Awareness-Reasoning/src/capability-runner/storage.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-runner/storage.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/capability-runner
- ../memory/storage/db

## Main Exports
- appendCapabilityEvent
- appendCapabilityEvent
- getCapabilityRun
- getCapabilityRun
- getCapabilityRunSnapshot
- getCapabilityRunSnapshot
- getLatestNonTerminalCapabilityRun
- getLatestNonTerminalCapabilityRun

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.js
