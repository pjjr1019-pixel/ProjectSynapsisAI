<!-- source-hash:84fe3a66eacef3eda2a24d23c2c14a3600c8a56f64a02112e81bca407de680dd; note-hash:008856cc63f5484da338e5142f01e354a1f196eb4f3f7a008b996bf829e7eb7f -->
# SynAI/packages/Awareness-Reasoning/src/local-ai/env.ts

## Path
SynAI/packages/Awareness-Reasoning/src/local-ai/env.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- node:fs
- node:path

## Main Exports
- ensureLocalEnvLoaded
- ensureLocalEnvLoaded

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/local-ai/env.js

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
