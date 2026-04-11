<!-- source-hash:b59a695add2f78196ab501e87d31b53ae2050e4601d97a02b21064c90fc0eb9d; note-hash:d2b4023d01765f8352eee9c4917f5beab37e04d2bd58232ae76d985b651fb448 -->
# SynAI/packages/Awareness-Reasoning/src/memory/storage/conversations.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/storage/conversations.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../../contracts/chat
- ./db

## Main Exports
- createConversation
- createConversation
- deleteConversation
- deleteConversation
- getConversation
- getConversation
- listConversations
- listConversations

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/conversations.js
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts

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
