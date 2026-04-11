<!-- source-hash:db9091350710ebd955b19a589c2d3679928bf4ee6ec2e5594dbf2efcc9c54d86; note-hash:c3c26ab8612c1bdb801dc2c16713d6105b3a8b0df02146298e84384abb924431 -->
# SynAI/packages/Awareness-Reasoning/src/files/queries.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/queries.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ./shared
- node:path

## Main Exports
- buildFileAwarenessContextSection
- buildFileAwarenessContextSection
- findFolderSummary
- findFolderSummary
- getLargestFiles
- getLargestFiles
- getNewestFiles
- getNewestFiles

## Likely Side Effects
unknown

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/queries.js
- SynAI/packages/Awareness-Reasoning/src/files/shared.ts

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
