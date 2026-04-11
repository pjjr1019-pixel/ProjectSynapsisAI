<!-- source-hash:98bcdab8fb45c2559ebf2804ddb21a95e5496b18ca6b5ce4b66e37bd8a3a8298; note-hash:37604b56ed7c57e99ac982c5e962a036f1a09ee4b042ee15819676127645d72f -->
# SynAI/packages/Awareness-Reasoning/src/memory/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ../contracts/chat
- ../contracts/memory
- ../contracts/prompt-intent
- ../contracts/prompt-preferences
- ../contracts/rag
- ../contracts/reasoning-profile
- ../retrieval

## Main Exports
- appendChatMessage
- appendChatMessage
- buildContextPreview
- buildContextPreview
- buildPromptMessages
- buildPromptMessages
- clearConversationMessages
- clearConversationMessages

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-preferences.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/rag.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/reasoning-profile.ts
- SynAI/packages/Awareness-Reasoning/src/memory/index.js

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
