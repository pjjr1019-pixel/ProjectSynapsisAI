<!-- source-hash:1ef3f9a11ea2f94241ee24a23f4fbddf7007c3fb6fd99d6f83c88972a2075779; note-hash:9d3175fd18c06054585a244f87011aa1a5e7c4c28c038718a31dc2c665e68ede -->
# SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts

## Path
SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- node:child_process

## Main Exports
- DEFAULT_POWERSHELL_MAX_BUFFER_BYTES
- DEFAULT_POWERSHELL_MAX_BUFFER_BYTES
- DEFAULT_POWERSHELL_TIMEOUT_MS
- DEFAULT_POWERSHELL_TIMEOUT_MS
- runPowerShellJson
- runPowerShellJson
- RunPowerShellJsonOptions

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/windows/powershell.js
- SynAI/packages/Awareness-Reasoning/tests/windows-powershell.test.js
- SynAI/packages/Awareness-Reasoning/tests/windows-powershell.test.ts

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
