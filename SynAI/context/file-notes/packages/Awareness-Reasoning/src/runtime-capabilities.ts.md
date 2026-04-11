<!-- source-hash:bb16a17915e105e799bc27401f8cd2247eb86708c63251a7dea34f512f19ddb9; note-hash:471986afe375395e2e2ea329509e677a3204f1dfc08a86ccb216f710df7dc8c5 -->
# SynAI/packages/Awareness-Reasoning/src/runtime-capabilities.ts

## Path
SynAI/packages/Awareness-Reasoning/src/runtime-capabilities.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./contracts/ipc
- node:fs/promises
- node:path
- node:url

## Main Exports
- findRuntimeCapabilityPlugin
- findRuntimeCapabilityPlugin
- listRuntimeCapabilityPlugins
- listRuntimeCapabilityPlugins
- loadRuntimeCapabilityRegistry
- loadRuntimeCapabilityRegistry
- RuntimeCapabilityRegistrySnapshot
- setRuntimeCapabilityPluginApproval

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/ipc.ts
- SynAI/packages/Awareness-Reasoning/src/runtime-capabilities.js
- SynAI/tests/capability/runtime-capabilities.test.js
- SynAI/tests/capability/runtime-capabilities.test.ts

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
