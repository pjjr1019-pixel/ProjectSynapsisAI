<!-- source-hash:a4be1536070b39a9c62aa8ad30ad17ff6408fc231cca2bb4684b1f44ff5bb0db; note-hash:660b551e93d01d6c37a1dc6619bf6ca4a701583071983187918b2d95a7862e74 -->
# SynAI/packages/Awareness-Reasoning/src/reasoning/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/reasoning/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../context
- ../contracts/awareness
- ../files/shared
- ../machine
- ../screen/shared
- ./resource-usage
- node:crypto
- node:fs

## Main Exports
- AwarenessAnomalyDiagnosticInput
- AwarenessCurrentUiDiagnosticInput
- AwarenessEventLogDiagnosticInput
- AwarenessHistoryView
- AwarenessPathView
- AwarenessPerformanceDiagnosticInput
- AwarenessQueryBuildInput
- AwarenessStartupDiagnosticInput

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/shared.ts
- SynAI/packages/Awareness-Reasoning/src/machine/index.ts
- SynAI/packages/Awareness-Reasoning/src/reasoning/index.js
- SynAI/packages/Awareness-Reasoning/src/reasoning/resource-usage.ts
- SynAI/packages/Awareness-Reasoning/src/screen/shared.ts
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

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
