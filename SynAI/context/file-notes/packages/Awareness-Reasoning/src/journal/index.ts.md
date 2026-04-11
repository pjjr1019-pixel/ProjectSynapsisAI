<!-- source-hash:321540c1c5b544de70e994bb7b6c4e9e8ab406337057fc92e7c4f07724d28f17; note-hash:c5a6e77a0cc19657c88ba8730475509a747255e85588b15861b939fe64ca0724 -->
# SynAI/packages/Awareness-Reasoning/src/journal/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/journal/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/awareness
- node:crypto
- node:fs/promises
- node:path

## Main Exports
- appendAwarenessEvent
- appendAwarenessEvent
- AppendAwarenessEventInput
- normalizeAwarenessEvent
- normalizeAwarenessEvent
- readAwarenessEvents
- readAwarenessEvents
- rotateEventsJournal

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/journal/index.js
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
