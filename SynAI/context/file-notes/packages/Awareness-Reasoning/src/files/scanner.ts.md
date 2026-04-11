<!-- source-hash:046e0e1147256f8a45dcec00bf0448c6ed1e8c6637abbec93093c74862a67df9; note-hash:c936d40105e99a595c88b03f0ded385471fb5f673ccb67652799a3a18d754f2e -->
# SynAI/packages/Awareness-Reasoning/src/files/scanner.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/scanner.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ./shared
- node:crypto
- node:fs
- node:fs/promises
- node:path

## Main Exports
- buildFileAwarenessSummary
- buildFileAwarenessSummary
- captureFileAwarenessSnapshot
- captureFileAwarenessSnapshot
- detectChanges
- detectChanges
- readFileAwarenessSnapshot
- readFileAwarenessSnapshot

## Likely Side Effects
filesystem or process side effects

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/scanner.js
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
