<!-- source-hash:f0d98fcbd6d69d1012e6d2c08d5cd2a1b38e6fb0c6401c3d0d7748db3ca2e234; note-hash:1526d801b31e3c2649a2cf8e54741e61f9b09da0a40d5070c56bd133262a9a09 -->
# SynAI/packages/Awareness-Reasoning/src/files/state.ts

## Path
SynAI/packages/Awareness-Reasoning/src/files/state.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- ./queries
- ./scanner
- ./shared
- ./volumes
- node:fs/promises

## Main Exports
- initializeFileAwareness
- initializeFileAwareness

## Likely Side Effects
filesystem or process side effects

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.ts
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.ts
- SynAI/packages/Agent-Runtime/tests/runtime/runtime.state.integration.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/runtime.state.integration.test.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/files/queries.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/file-runtime-state-store.test.ts
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/in-memory-runtime-state-store.test.ts
- SynAI/packages/Agent-Runtime/tests/runtime/runtime.state.integration.test.js
- SynAI/packages/Agent-Runtime/tests/runtime/runtime.state.integration.test.ts
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
