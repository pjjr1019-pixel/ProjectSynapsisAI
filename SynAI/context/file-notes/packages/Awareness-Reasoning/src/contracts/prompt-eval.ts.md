<!-- source-hash:b06df75f8389bfc84545ff3d75352229e3cbde576deeb8960e078f3e22390a13; note-hash:93e96439001e873985b26434597ec5b5443eef51e3fd5acb9e4633f9bce2fd3d -->
# SynAI/packages/Awareness-Reasoning/src/contracts/prompt-eval.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/prompt-eval.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./awareness
- ./chat
- ./health
- ./rag
- ./reasoning-profile

## Main Exports
- PROMPT_EVAL_CHECK_CATEGORIES
- PROMPT_EVAL_CHECK_CATEGORIES
- PROMPT_EVAL_CHECK_KINDS
- PROMPT_EVAL_CHECK_KINDS
- PROMPT_EVAL_DIFFICULTIES
- PROMPT_EVAL_DIFFICULTIES
- PROMPT_EVAL_QUALITY_STATUSES
- PROMPT_EVAL_QUALITY_STATUSES

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.ts
- SynAI/apps/desktop/electron/prompt-eval.test.js
- SynAI/apps/desktop/electron/prompt-eval.test.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/health.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/prompt-eval.js

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.js
- SynAI/apps/desktop/electron/prompt-eval-analysis.test.ts
- SynAI/apps/desktop/electron/prompt-eval.test.js
- SynAI/apps/desktop/electron/prompt-eval.test.ts
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
