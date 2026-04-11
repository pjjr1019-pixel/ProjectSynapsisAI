<!-- source-hash:4355aa6d0e4433542661bf6d41f7d6342f824af7836d8cfaa378a9fe2047584c; note-hash:41ea64b836801b951b60dc3ac8bac982ba1e3a47dc449bcc5d4ff69f64b90c5d -->
# SynAI/packages/Governance-Execution/src/governed-chat/remediation.ts

## Path
SynAI/packages/Governance-Execution/src/governed-chat/remediation.ts

## Area
primary-synai

## Role
support

## Purpose
Governed execution policy/orchestration module.

## Main Imports
- ./gap-classifier
- ./types
- @capability-catalog

## Main Exports
- GovernedTaskRemediationInput
- planGovernedTaskRemediation
- planGovernedTaskRemediation

## Likely Side Effects
unknown

## State Touched
governed execution state

## Related Files
- SynAI/packages/Governance-Execution/src/governed-chat/gap-classifier.ts
- SynAI/packages/Governance-Execution/src/governed-chat/remediation.js
- SynAI/packages/Governance-Execution/src/governed-chat/types.ts
- SynAI/tests/capability/remediation-planner.test.js
- SynAI/tests/capability/remediation-planner.test.ts
- SynAI/tests/e2e/capability-remediation-loop.smoke.test.js
- SynAI/tests/e2e/capability-remediation-loop.smoke.test.ts

## Edit Risk
high

## Edit Guidance
Keep semantics explicit, preserve approvals/clarification details, and run focused capability tests.

## Likely Tests Affected
- SynAI/tests/capability/remediation-planner.test.js
- SynAI/tests/capability/remediation-planner.test.ts
- SynAI/tests/e2e/capability-remediation-loop.smoke.test.js
- SynAI/tests/e2e/capability-remediation-loop.smoke.test.ts
