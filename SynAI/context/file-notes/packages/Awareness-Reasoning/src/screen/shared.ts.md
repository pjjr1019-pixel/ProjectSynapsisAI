<!-- source-hash:3c00c91d722675c95a3081171adb6fcb9a78aa3fce6b3e29a66a6891fa5fda53; note-hash:ed4c3b1c8932a716cdd3c5d6535112027d1d81975fbaf490695ffa5037120038 -->
# SynAI/packages/Awareness-Reasoning/src/screen/shared.ts

## Path
SynAI/packages/Awareness-Reasoning/src/screen/shared.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../context
- ../contracts/awareness

## Main Exports
- buildCounts
- buildCounts
- buildFreshness
- buildFreshness
- buildHighlights
- buildHighlights
- buildScreenDiffSummary
- buildScreenDiffSummary

## Likely Side Effects
unknown

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/screen/shared.js

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
