<!-- source-hash:ae13286515d0d1fc9c675c2f28475607d5d68a6d24447074cad91af23a5e37ba; note-hash:f35e17b8aeb94b6101294c7e2fc4b214c5482910cbe9da4b2fe43c96f5f1b8f7 -->
# SynAI/packages/Awareness-Reasoning/src/screen/windows.ts

## Path
SynAI/packages/Awareness-Reasoning/src/screen/windows.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../windows/powershell
- ./shared
- ./shared
- node:fs/promises
- node:path

## Main Exports
- createFixtureScreenCaptureSource
- createFixtureScreenCaptureSource
- createWindowsScreenCaptureSource
- createWindowsScreenCaptureSource

## Likely Side Effects
filesystem or process side effects

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/screen/shared.ts
- SynAI/packages/Awareness-Reasoning/src/screen/windows.js
- SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts
- SynAI/packages/Awareness-Reasoning/tests/windows-powershell.test.js
- SynAI/packages/Awareness-Reasoning/tests/windows-powershell.test.ts
- SynAI/packages/Awareness-Reasoning/tests/windows-search.test.js
- SynAI/packages/Awareness-Reasoning/tests/windows-search.test.ts

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
