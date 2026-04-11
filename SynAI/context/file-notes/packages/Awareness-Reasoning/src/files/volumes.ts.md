<!-- source-hash:3a856ef2e4379bc2a5906c8b156618da9251a11ebebede875e92398bae89a08f; note-hash:4ce23221f6e0183757eca24b24371392f5bf83209c0ba3e6570214e677e90cb8 -->
# SynAI/packages/Awareness-Reasoning/src/files/volumes.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/volumes.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../windows/powershell
- ./journal
- ./shared
- node:fs
- node:fs/promises
- node:os
- node:path

## Main Exports
- browseFolderSummary
- browseFolderSummary
- buildVolumeAwarenessState
- buildVolumeAwarenessState
- enumerateLocalVolumes
- enumerateLocalVolumes

## Likely Side Effects
filesystem or process side effects

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/journal.ts
- SynAI/packages/Awareness-Reasoning/src/files/shared.ts
- SynAI/packages/Awareness-Reasoning/src/files/volumes.js
- SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts

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
