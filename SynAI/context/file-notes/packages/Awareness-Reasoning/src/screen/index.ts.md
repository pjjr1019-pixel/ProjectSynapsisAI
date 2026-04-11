<!-- source-hash:a16cc8342e43421fd90ca1f96ddfef529dce98472b48a6a049646c8ff2e34767; note-hash:ba0bee0392793df92697b133c378a20d2a563f1a586f7efc3e57705be31cdfe1 -->
# SynAI/packages/Awareness-Reasoning/src/screen/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/screen/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../journal
- ./shared
- ./shared
- ./windows
- node:crypto
- node:fs/promises
- node:path

## Main Exports
- buildScreenAwarenessContextSection
- buildScreenAwarenessContextSection
- initializeScreenAwareness
- initializeScreenAwareness
- ScreenAwarenessState
- ScreenCaptureOptions
- ScreenRuntimePaths
- createFixtureScreenCaptureSource

## Likely Side Effects
filesystem or process side effects

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/journal/index.ts
- SynAI/packages/Awareness-Reasoning/src/screen/index.js
- SynAI/packages/Awareness-Reasoning/src/screen/shared.ts
- SynAI/packages/Awareness-Reasoning/src/screen/windows.ts
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
