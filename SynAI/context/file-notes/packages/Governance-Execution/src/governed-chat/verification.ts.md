<!-- source-hash:bd4a0425551cfe8afe40cd0d4119113881c180423f1e5af9357680c408245deb; note-hash:2d4483326a5b9aa98935bf2dcc364e63585c9292f8677402c261c9c2313a3e42 -->
# SynAI/packages/Governance-Execution/src/governed-chat/verification.ts

## Path
SynAI/packages/Governance-Execution/src/governed-chat/verification.ts

## Area
primary-synai

## Role
support

## Purpose
Governed execution policy/orchestration module.

## Main Imports
- ./types
- @contracts
- node:fs/promises
- node:path

## Main Exports
- GovernedTaskVerificationInput
- summarizeVerification
- summarizeVerification
- verifyGovernedTaskExecution
- verifyGovernedTaskExecution

## Likely Side Effects
filesystem or process side effects

## State Touched
governed execution state

## Related Files
- SynAI/packages/Governance-Execution/src/governed-chat/types.ts
- SynAI/packages/Governance-Execution/src/governed-chat/verification.js

## Edit Risk
high

## Edit Guidance
Keep semantics explicit, preserve approvals/clarification details, and run focused capability tests.

## Likely Tests Affected
- needs verification
