<!-- source-hash:40e9bc763ffd7b64035964374a7affadb7e152018caa78b5c68b66a158f9cbdb; note-hash:25fab2bc2137740c68aa70c91e7a43657856b5259c139f1c9d86902709e81957 -->
# SynAI/apps/desktop/electron/prompt-eval.ts

## Path
SynAI/apps/desktop/electron/prompt-eval.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- ./prompting/task-classifier
- @contracts
- node:path

## Main Exports
- buildPromptEvaluationChatHistoryPath
- buildPromptEvaluationChatHistoryPath
- buildPromptEvaluationReportFileName
- buildPromptEvaluationReportFileName
- buildPromptEvaluationReportPath
- buildPromptEvaluationReportPath
- formatPromptEvaluationMarkdown
- formatPromptEvaluationMarkdown

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.ts
- SynAI/apps/desktop/electron/prompt-eval.js
- SynAI/apps/desktop/electron/prompt-eval.test.js
- SynAI/apps/desktop/electron/prompt-eval.test.ts
- SynAI/apps/desktop/electron/prompting/task-classifier.ts
- SynAI/tests/prompt-evals/canonical-cases.ts
- SynAI/tests/smoke/prompt-evaluation-card.smoke.test.tsx

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.ts
- SynAI/apps/desktop/electron/prompt-eval.test.js
- SynAI/apps/desktop/electron/prompt-eval.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
