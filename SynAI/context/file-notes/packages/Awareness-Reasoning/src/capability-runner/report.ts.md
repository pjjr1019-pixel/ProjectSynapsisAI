<!-- source-hash:cd94834949dacadac266e3d5e86937b24b0c1eda4dc2c45fb595511dd608cb28; note-hash:572c69787d427a04007b14fddf7ec152c3408e6b6c996907e43ed9860808dea7 -->
# SynAI/packages/Awareness-Reasoning/src/capability-runner/report.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-runner/report.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/capability-runner
- node:fs/promises
- node:path

## Main Exports
- formatCapabilityRunMarkdown
- formatCapabilityRunMarkdown
- writeAtomicTextFile
- writeAtomicTextFile
- writeCapabilityRunReports
- writeCapabilityRunReports

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts

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
