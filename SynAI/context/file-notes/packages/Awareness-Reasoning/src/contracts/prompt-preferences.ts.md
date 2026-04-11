<!-- source-hash:218b54cf180a52a9858ad15b86ea8a3f6877aac1d98a4ca87a76738eff7c8380; note-hash:995da8c318ebeac8adabf685cf9d24ce71690e2f28826100c0568c7afba0ad00 -->
# SynAI/packages/Awareness-Reasoning/src/contracts/prompt-preferences.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/prompt-preferences.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./chat
- ./prompt-intent

## Main Exports
- PromptBehaviorEntryKind
- PromptBehaviorMemoryBase
- PromptBehaviorMemoryEntry
- PromptBehaviorPreferenceMemory
- PromptBehaviorResolution
- PromptBehaviorResolvedPatternMemory
- RetrievedPromptBehaviorMemory

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.js
