<!-- source-hash:5fb1717a720c53e9075e38530d333c2bd31a2537fe220ddd30b1c6a78cbdeb2c; note-hash:38f72c071c9a00da78597987253b8c3aeb21b99729dbd7d427a69d42892c0f9c -->
# SynAI/packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../adapter
- ../approval/gate
- ../artifacts/store
- ../cards
- ../classifiers/gap-classifier
- ../remediation/planner
- ../schema
- ../types

## Main Exports
- defaultRunnerOptions
- defaultRunnerOptions
- runCapabilityEval
- runCapabilityEval
- RunCapabilityEvalInput

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/capability-eval/adapter.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/approval/gate.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/cards.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/classifiers/gap-classifier.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/remediation/planner.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner.js
- SynAI/packages/Awareness-Reasoning/src/capability-eval/schema.ts
- SynAI/packages/Awareness-Reasoning/src/capability-eval/types.ts

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
