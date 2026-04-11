<!-- source-hash:ebf02b5abf1d7bac36679d86c26622422a04d6aa61209d772617fbbf7e38a1df; note-hash:3ebcbd79f1472a3afb7fc55b56076a250a5afbba7a1845efcf2c77c53dc5910a -->
# SynAI/packages/Awareness-Reasoning/src/memory/storage/messages.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/storage/messages.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../../contracts/chat
- ../../contracts/memory
- ./db

## Main Exports
- addMessage
- addMessage
- clearMessages
- clearMessages
- listMessages
- listMessages
- removeLastAssistantMessage
- removeLastAssistantMessage

## Likely Side Effects
unknown

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts
- SynAI/packages/Awareness-Reasoning/src/memory/storage/messages.js

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
