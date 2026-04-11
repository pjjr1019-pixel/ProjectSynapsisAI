<!-- source-hash:ade081eb0f1524e0e7ca1d0d1fda03848bb21c729fcef57517a3be51f6a914eb; note-hash:94a87eb56f073c8b350287c16bcae72e5459624a225c09671e60d71d07f2cdfc -->
# SynAI/packages/Awareness-Reasoning/src/files/windows-search.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/windows-search.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../windows/powershell
- ./shared
- node:path

## Main Exports
- queryWindowsIndexedEntries
- queryWindowsIndexedEntries
- WindowsSearchQueryOptions
- WindowsSearchQueryResult

## Likely Side Effects
unknown

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/shared.ts
- SynAI/packages/Awareness-Reasoning/src/files/windows-search.js
- SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts
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
