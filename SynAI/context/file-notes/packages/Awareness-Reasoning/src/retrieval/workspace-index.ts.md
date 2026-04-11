<!-- source-hash:51993f3c7cb4529ea9ca3d35520898e661487195ddd6ae1f3a3b09c0f87da93f; note-hash:472dcbaa6285504838cdd4d32defe1edc80b4d76c65f92ca70ae7c779c03811f -->
# SynAI/packages/Awareness-Reasoning/src/retrieval/workspace-index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/retrieval/workspace-index.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/rag
- ../local-ai/embeddings
- node:crypto
- node:fs/promises
- node:path

## Main Exports
- ensureWorkspaceIndex
- ensureWorkspaceIndex
- getWorkspaceIndexStatus
- getWorkspaceIndexStatus
- queryWorkspaceIndex
- queryWorkspaceIndex
- WorkspaceIndexOptions
- WorkspaceQueryResult

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/rag.ts
- SynAI/packages/Awareness-Reasoning/src/local-ai/embeddings.ts
- SynAI/packages/Awareness-Reasoning/src/retrieval/workspace-index.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

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
