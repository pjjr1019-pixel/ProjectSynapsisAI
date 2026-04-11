<!-- source-hash:7fab16bf9b8909c5529f10fee05d5e0165e407364285a0c14c262bcb99627c56; note-hash:2f8097134f131108d88bcc839af08e91ea79ecd3137e203c99f5f020595750bb -->
# SynAI/apps/desktop/electron/prompt-eval-analysis.ts

## Path
SynAI/apps/desktop/electron/prompt-eval-analysis.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts

## Main Exports
- buildPromptEvaluationComparison
- buildPromptEvaluationComparison
- buildPromptEvaluationRoutingReport
- buildPromptEvaluationRoutingReport
- countPromptEvaluationAssertions
- countPromptEvaluationAssertions
- evaluatePromptEvaluationCase
- evaluatePromptEvaluationCase

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompt-eval-analysis.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
