<!-- source-hash:45a9a98905949d43ea17bbb990d597b72e91be9e18b4aec76e7ee2d04c07b937; note-hash:62c14ad3d2c9aa73024662e3ac66dadbe8b79f45f6613c42a0e5cc2c2a53f03a -->
# SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/prompt-intent.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./awareness
- ./chat

## Main Exports
- PROMPT_INTENT_AMBIGUITY_FLAGS
- PROMPT_INTENT_AMBIGUITY_FLAGS
- PROMPT_INTENT_FAMILIES
- PROMPT_INTENT_FAMILIES
- PROMPT_INTENT_MISSING_EVIDENCE
- PROMPT_INTENT_MISSING_EVIDENCE
- PROMPT_INTENT_OUTPUT_LENGTHS
- PROMPT_INTENT_OUTPUT_LENGTHS

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
