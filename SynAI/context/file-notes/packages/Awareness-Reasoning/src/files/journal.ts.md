<!-- source-hash:4161d076069b005e9357beab78d29b75618d1b983fc6d10d20e8a893eaf74fc7; note-hash:0bab0bbf7d1e51de187782ef0c3dbf0a965f38fec630e84fbe3e41473a7b57c0 -->
# SynAI/packages/Awareness-Reasoning/src/files/journal.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/journal.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../windows/powershell

## Main Exports
- refreshVolumeJournalState
- refreshVolumeJournalState

## Likely Side Effects
unknown

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/journal.js
- SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts

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
