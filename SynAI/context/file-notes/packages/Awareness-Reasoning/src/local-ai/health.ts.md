<!-- source-hash:9a1a4422948c078e4bf6ecc08454e00ee030cd2ba64d18b3dadb26db4057fc8f; note-hash:168639f0b6a12d4254d179fed2a1ba3d7b1981be67f09f3ecf67a6244aa08f94 -->
# SynAI/packages/Awareness-Reasoning/src/local-ai/health.ts

## Path
SynAI/packages/Awareness-Reasoning/src/local-ai/health.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/health
- ./ollama
- ./ollama

## Main Exports
- checkOllamaHealth
- checkOllamaHealth

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/health.ts
- SynAI/packages/Awareness-Reasoning/src/local-ai/health.js
- SynAI/packages/Awareness-Reasoning/src/local-ai/ollama.ts
- SynAI/tests/smoke/local-ai-health.smoke.test.js
- SynAI/tests/smoke/local-ai-health.smoke.test.ts

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
