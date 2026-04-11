<!-- source-hash:82881df2e0f1d2982c5f62b7aceaa9742863a46c35d06e25435cff68dffe4da5; note-hash:94075d441ce41612315f069984ae93082b335cefbcff4f2ba269c5abc30555e1 -->
# SynAI/packages/Awareness-Reasoning/src/bootstrap/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/bootstrap/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../baseline
- ../context
- ../contracts/awareness
- ../contracts/health
- ../files
- ../journal
- ../machine
- ../official-knowledge

## Main Exports
- AwarenessEngine
- AwarenessEngineOptions
- AwarenessRuntimeSnapshot
- AwarenessStatus
- initializeAwarenessEngine
- initializeAwarenessEngine
- readAwarenessJournal
- readAwarenessJournal

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/baseline/index.ts
- SynAI/packages/Awareness-Reasoning/src/bootstrap/index.js
- SynAI/packages/Awareness-Reasoning/src/bootstrap/insights.ts
- SynAI/packages/Awareness-Reasoning/src/bootstrap/task-runner.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/health.ts
- SynAI/packages/Awareness-Reasoning/src/files/index.ts
- SynAI/packages/Awareness-Reasoning/src/journal/index.ts

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
