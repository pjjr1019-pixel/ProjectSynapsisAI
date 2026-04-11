<!-- source-hash:64518479b9a0e1e1a478f360af591a0a7d4437c0539c2479e56365f8cc7d7a1c; note-hash:36c35446364a2c13e1ad8d0591c138e4c0b298c15c448ae17fbf51d2fa0def2b -->
# SynAI/packages/Agent-Runtime/src/executor/index.ts

## Path
SynAI/packages/Agent-Runtime/src/executor/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ../core
- ../skills/SkillRegistry

## Main Exports
- AgentActionAdapter
- createActionRequestForStep
- createActionRequestForStep
- createDefaultActionAdapters
- createDefaultActionAdapters
- createSkillActionAdapter
- createSkillActionAdapter
- createUnsupportedActionProposal

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/executor/index.js
- SynAI/packages/Agent-Runtime/src/skills/SkillRegistry.ts
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
