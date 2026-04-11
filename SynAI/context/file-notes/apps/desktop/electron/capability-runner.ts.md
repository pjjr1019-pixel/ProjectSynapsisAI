<!-- source-hash:7115d9bd170f3791e7cd9c029c423b66f659672c974bdee9c8dc9d6b60312283; note-hash:76359322b2ddd8a81e9e6cee4928c58d3fea2c079045e1d63e21603f7092763f -->
# SynAI/apps/desktop/electron/capability-runner.ts

## Path
SynAI/apps/desktop/electron/capability-runner.ts

## Area
primary-synai

## Role
support

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @awareness/capability-runner
- @contracts
- node:crypto
- node:path

## Main Exports
- CapabilityRunService
- createCapabilityRunService
- createCapabilityRunService

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- none identified

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
