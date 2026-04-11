<!-- source-hash:90dbe8114c0d6dfd9a823df4389e70fdb48f1aab64b5648d47e515a4eec10abd; note-hash:286a09786f82a9516b87567b4c64c590fb8b16fcaa1059c5cb7f90f6adb0ec52 -->
# SynAI/packages/Awareness-Reasoning/src/memory/storage/summaries.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/storage/summaries.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../../contracts/memory
- ./db

## Main Exports
- deleteSummary
- deleteSummary
- getSummary
- getSummary
- upsertSummary
- upsertSummary

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/summaries.js

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
