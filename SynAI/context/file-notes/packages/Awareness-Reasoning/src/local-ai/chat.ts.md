<!-- source-hash:e9ef3a05c13f2485f5e73b460e5fa254f1a97e4fc9a1e2f7e671351619c18bc1; note-hash:4f1fb6c7f9c185af878448d018f1eb3b6a06227afd62deafad76c2b729c6f004 -->
# SynAI/packages/Awareness-Reasoning/src/local-ai/chat.ts

## Path
SynAI/packages/Awareness-Reasoning/src/local-ai/chat.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/chat
- ./ollama
- ./ollama

## Main Exports
- sendOllamaChat
- sendOllamaChat
- sendOllamaChatStream
- sendOllamaChatStream

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/local-ai/chat.js
- SynAI/packages/Awareness-Reasoning/src/local-ai/ollama.ts
- SynAI/packages/Awareness-Reasoning/tests/reasoning-chat.test.js
- SynAI/packages/Awareness-Reasoning/tests/reasoning-chat.test.ts
- SynAI/tests/capability/chat-execution-service.test.js
- SynAI/tests/capability/chat-execution-service.test.ts
- SynAI/tests/capability/governed-chat-router.test.js

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
