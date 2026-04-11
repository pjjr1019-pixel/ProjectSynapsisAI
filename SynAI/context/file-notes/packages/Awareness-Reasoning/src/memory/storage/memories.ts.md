<!-- source-hash:1e82e32fd109054b34352845c9e03dbc8748c6f0d9cefdb3d3fd1f651afae1f8; note-hash:53d515a1f81815801e2af9df70267da63c6a87e1781e9bf00c509245dedde1aa -->
# SynAI/packages/Awareness-Reasoning/src/memory/storage/memories.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/storage/memories.ts

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
- batchUpsertMemories
- batchUpsertMemories
- deleteMemory
- deleteMemory
- listMemories
- listMemories
- searchMemoryKeywords
- searchMemoryKeywords

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/memories.js

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
