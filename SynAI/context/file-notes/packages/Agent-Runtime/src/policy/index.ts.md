<!-- source-hash:43b3bb598fc7c96733fffb09b0544c64e4d38726ce766602bdb92a5c19141926; note-hash:c077fe97403877ae24dc4df073995ac40a4e82872f845485c48005c9ebba2164 -->
# SynAI/packages/Agent-Runtime/src/policy/index.ts

## Path
SynAI/packages/Agent-Runtime/src/policy/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ../core

## Main Exports
- ApprovalValidationInput
- ApprovalValidationResult
- ApprovalValidator
- evaluateTaskPolicy
- evaluateTaskPolicy
- validateApprovalBinding
- validateApprovalBinding

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/core/index.ts
- SynAI/packages/Agent-Runtime/src/policy/index.js
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
