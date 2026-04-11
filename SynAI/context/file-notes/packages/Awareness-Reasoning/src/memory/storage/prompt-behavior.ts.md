<!-- source-hash:dda22585f91e91e19acd3ab7922eac12ab9723b947fa0f876efe1041084bbc47; note-hash:92fad5d564f4ac12f3177f29e63f82b4f812e5f55dfa0fea9b98ec24a48775cd -->
# SynAI/packages/Awareness-Reasoning/src/memory/storage/prompt-behavior.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/storage/prompt-behavior.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../../contracts/chat
- ../../contracts/prompt-intent
- ../../contracts/prompt-preferences
- ./db

## Main Exports
- listPromptBehaviorMemories
- listPromptBehaviorMemories
- markPromptBehaviorMemoriesApplied
- markPromptBehaviorMemoriesApplied
- MatchPromptBehaviorInput
- matchPromptBehaviorMemories
- matchPromptBehaviorMemories
- upsertPromptBehaviorPreference

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-preferences.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts
- SynAI/packages/Awareness-Reasoning/tests/prompt-behavior-memory.test.ts
- SynAI/tests/smoke/prompt-behavior-memory.smoke.test.ts

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
