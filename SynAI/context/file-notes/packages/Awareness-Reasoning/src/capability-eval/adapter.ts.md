<!-- source-hash:8572b906ed46e35336ebe5e763a7355d9d5f647509ab15ec43573c2f9c1410ac; note-hash:1020248e6557f0b9b11e240852b8e2db0434e6c40aa376dcbaa7d073026bd89e -->
# SynAI/packages/Awareness-Reasoning/src/capability-eval/adapter.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-eval/adapter.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../bootstrap
- ../contracts/awareness
- ../contracts/chat
- ../local-ai
- ./actions/windows-action-layer
- ./context
- ./contract
- ./types

## Main Exports
- CapabilityEvalAdapter
- CapabilityEvalAdapterOptions
- createCapabilityEvalAdapter
- createCapabilityEvalAdapter
- resolveDefaultCapabilityRoots
- resolveDefaultCapabilityRoots

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/bootstrap/index.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/actions/windows-action-layer.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/adapter.js
- SynAI/packages/Awareness-Reasoning/src/capability-eval/context.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/contract.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/types.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts

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
