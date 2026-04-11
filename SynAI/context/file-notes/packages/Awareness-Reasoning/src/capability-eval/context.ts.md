<!-- source-hash:169085460b088c8fa5e6c119239e1f1ea45d0fe7fc1fcdc2c164b0f47a3df3d3; note-hash:d74ab85dcfde005fbb1158d0f454fb09a92d62fc1c721c6c6a6eb5ac980bdbf3 -->
# SynAI/packages/Awareness-Reasoning/src/capability-eval/context.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-eval/context.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../bootstrap
- ../contracts/awareness
- ../retrieval
- ./types
- node:fs/promises
- node:path

## Main Exports
- resolveCapabilityContext
- resolveCapabilityContext
- ResolveCapabilityContextOptions

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/bootstrap/index.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/context.js
- SynAI/packages/Awareness-Reasoning/src/capability-eval/types.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/retrieval/index.ts
- SynAI/tests/smoke/context-assembly.smoke.test.js
- SynAI/tests/smoke/context-assembly.smoke.test.ts

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
