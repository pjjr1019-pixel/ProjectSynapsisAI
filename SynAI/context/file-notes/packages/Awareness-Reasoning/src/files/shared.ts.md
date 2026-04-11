<!-- source-hash:55595332fd2f846aeab969024405df700c66bfc13c7848456649db8ca324a6a2; note-hash:7eaafd373ec2eb7d8e4c6b897c90f29804e1db0904f0d41ba9de70824915870d -->
# SynAI/packages/Awareness-Reasoning/src/files/shared.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/shared.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- node:crypto
- node:fs
- node:fs/promises
- node:os
- node:path

## Main Exports
- binaryExtensions
- binaryExtensions
- buildFileAwarenessRuntimePaths
- buildFileAwarenessRuntimePaths
- chooseRoots
- chooseRoots
- classifyPrivacyScope
- classifyPrivacyScope

## Likely Side Effects
filesystem or process side effects

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/shared.js

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
