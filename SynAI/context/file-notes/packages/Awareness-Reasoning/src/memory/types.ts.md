<!-- source-hash:87963438d469b97e5fcdbbcc99cc98289d5f43b29c4fd3ac027777411489d851; note-hash:26732745458fd836cc0f7de2741ec4401b8619ab32b4fe9874c679b1e38c9429 -->
# SynAI/packages/Awareness-Reasoning/src/memory/types.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/types.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/capability-runner
- ../contracts/chat
- ../contracts/memory
- ../contracts/prompt-preferences

## Main Exports
- ContextBudget
- RetrievalResult
- SynAIDatabase

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-preferences.ts
- SynAI/packages/Awareness-Reasoning/src/memory/types.js

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
