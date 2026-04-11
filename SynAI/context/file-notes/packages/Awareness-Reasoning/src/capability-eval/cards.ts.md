<!-- source-hash:3cb4ce0640c2e93a14f3144e7b05492ca5f3096f16727418690dcfeba0c3a0ea; note-hash:1615445ae028ab055a07065ea634b9814301f41637487a7340cc82dedf738624 -->
# SynAI/packages/Awareness-Reasoning/src/capability-eval/cards.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-eval/cards.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./schema
- ./types
- node:fs/promises
- node:path

## Main Exports
- findCardById
- findCardById
- loadCapabilityCards
- loadCapabilityCards
- LoadedCapabilityCard

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/capability-eval/cards.js
- SynAI/packages/Awareness-Reasoning/src/capability-eval/schema.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/types.ts

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
