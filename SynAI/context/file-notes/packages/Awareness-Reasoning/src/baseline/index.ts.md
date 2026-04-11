<!-- source-hash:906f004bb02616d930adcba3826146bd1a391738e157dc9a70f82479a24c0727; note-hash:808ac0fc35923acd413c8f4e75ee0c021ee81c78aee28928b86fa201182dd7ea -->
# SynAI/packages/Awareness-Reasoning/src/baseline/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/baseline/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../context
- ../contracts/awareness
- node:child_process
- node:crypto
- node:fs
- node:os
- node:path
- node:util

## Main Exports
- buildAwarenessDigest
- buildAwarenessDigest
- BuildAwarenessDigestOptions
- buildAwarenessPromptSection
- buildAwarenessPromptSection
- buildLastReportedBaseline
- buildLastReportedBaseline
- buildSessionBaseline

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/baseline/index.js
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
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
