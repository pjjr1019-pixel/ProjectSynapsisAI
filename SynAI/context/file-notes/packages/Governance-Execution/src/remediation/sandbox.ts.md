<!-- source-hash:903db85e7c4f55be8811045d0747caa8aef878c9ad84626cadf8d570b2a9de3f; note-hash:ce193c355b6c289ea8dfa6f7ca0750c9711c3673bba3a29fffc4d367281d41d4 -->
# SynAI/packages/Governance-Execution/src/remediation/sandbox.ts

## Path
SynAI/packages/Governance-Execution/src/remediation/sandbox.ts

## Area
primary-synai

## Role
support

## Purpose
Governed execution policy/orchestration module.

## Main Imports
- ../commands/bus
- ../contracts
- node:fs/promises
- node:path

## Main Exports
- applyGovernedRemediationSandbox
- applyGovernedRemediationSandbox
- ApplyGovernedRemediationSandboxInput
- createGovernedPromotionHashInput
- createGovernedPromotionHashInput
- GovernancePatchInstruction
- GovernancePatchMode
- GovernedRemediationPlanInput

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Governance-Execution/src/commands/bus.ts
- SynAI/packages/Governance-Execution/src/contracts.ts
- SynAI/packages/Governance-Execution/src/remediation/sandbox.js

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- needs verification
