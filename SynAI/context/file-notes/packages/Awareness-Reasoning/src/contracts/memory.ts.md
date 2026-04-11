<!-- source-hash:8a0f71a8c9db475b7511d897da48ab2df3cbaba03bbb6e3f5d86650d4ac8828f; note-hash:8610d568c74fc1b631d90a774452d8cd4753caf906ae00db5f24cd9c4f77b814 -->
# SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./awareness
- ./chat
- ./grounding
- ./health
- ./prompt-intent
- ./prompt-preferences
- ./rag
- ./reasoning-profile

## Main Exports
- AgentRuntimePreviewSummary
- ContextPreview
- ConversationSummary
- MemoryCategory
- MemoryEntry
- RetrievedMemory
- WEB_SEARCH_SOURCE_FAMILIES
- WEB_SEARCH_SOURCE_FAMILIES

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/grounding.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/health.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/memory.js
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.ts
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
