<!-- source-hash:f2905e92983f947c1d68ac446a9da188b1b55887132ce79de7192ffd880860fc; note-hash:a4306a016d84f586b28cc5b11dd74bb1dc96194538b580e7267ae445d044c06a -->
# SynAI/packages/Awareness-Reasoning/src/capability-eval/schema.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-eval/schema.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./types
- ./types
- node:fs/promises

## Main Exports
- loadCapabilityCardFromFile
- loadCapabilityCardFromFile
- normalizeCapabilityCard
- normalizeCapabilityCard
- parseCapabilityCard
- parseCapabilityCard
- validateCapabilityCard
- validateCapabilityCard

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/capability-eval/schema.js
- SynAI/packages/Awareness-Reasoning/src/capability-eval/types.ts
- SynAI/tests/capability/schema.test.js
- SynAI/tests/capability/schema.test.ts

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
