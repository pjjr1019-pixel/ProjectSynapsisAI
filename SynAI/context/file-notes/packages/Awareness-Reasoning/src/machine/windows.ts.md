<!-- source-hash:4c5a116aec631c24d05c8dc9b823454301e4501baf3e140221764413041a4792; note-hash:86123de72ad71c2768aa9ffa413d55516217280c0d49317f02646876b6e57eb6 -->
# SynAI/packages/Awareness-Reasoning/src/machine/windows.ts

## Path
SynAI/packages/Awareness-Reasoning/src/machine/windows.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../windows/powershell
- ./index
- node:os

## Main Exports
- createWindowsMachineInventorySource
- createWindowsMachineInventorySource

## Likely Side Effects
unknown

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/machine/index.ts
- SynAI/packages/Awareness-Reasoning/src/machine/windows.js
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
