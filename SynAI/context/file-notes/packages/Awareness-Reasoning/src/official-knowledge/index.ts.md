<!-- source-hash:23ff9b32a2144c9e1d522e619c186509b53d12b273a066a6aabcb0ce577352af; note-hash:35f4e738648491b933e699dd470ee9f2fe6f8f45a24263f31a9e6658749d920b -->
# SynAI/packages/Awareness-Reasoning/src/official-knowledge/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/official-knowledge/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../contracts/awareness
- ./catalog
- node:fs/promises
- node:path

## Main Exports
- buildOfficialKnowledgeContextSection
- buildOfficialKnowledgeContextSection
- initializeOfficialKnowledge
- initializeOfficialKnowledge
- OfficialKnowledgeInitOptions
- OfficialKnowledgeQueryOptions
- OfficialKnowledgeRuntimePaths
- OfficialKnowledgeState

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/official-knowledge/catalog.ts
- SynAI/packages/Awareness-Reasoning/src/official-knowledge/index.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

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
