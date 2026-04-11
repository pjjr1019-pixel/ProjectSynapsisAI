<!-- source-hash:a9716248fe72ad24c96595ced0d47776805dee4fb73727ba885fe9d23fbfd6a2; note-hash:e27ba58b7cbb4d6b75a713c0a6ed21d371c2be7d261ae63cb70d8069fb02abfb -->
# SynAI/packages/Awareness-Reasoning/src/local-ai/ollama.ts

## Path
SynAI/packages/Awareness-Reasoning/src/local-ai/ollama.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./env
- node:child_process
- node:fs
- node:os
- node:path

## Main Exports
- __resetOllamaRuntimeForTests
- __resetOllamaRuntimeForTests
- __setOllamaRuntimeHooksForTests
- __setOllamaRuntimeHooksForTests
- getOllamaConfig
- getOllamaConfig
- isOllamaReachabilityErrorDetail
- isOllamaReachabilityErrorDetail

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/local-ai/env.ts
- SynAI/packages/Awareness-Reasoning/src/local-ai/ollama.js

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
