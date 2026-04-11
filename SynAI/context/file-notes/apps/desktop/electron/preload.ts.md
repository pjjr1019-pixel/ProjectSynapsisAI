<!-- source-hash:218bb9a593e62b4a66bda807493a10aa5d6984976ea52ca421c974679972338b; note-hash:a06637a15fa20dcc00e3af2228e10933d46eac7d27e847aa291fc942e9951cff -->
# SynAI/apps/desktop/electron/preload.ts

## Path
SynAI/apps/desktop/electron/preload.ts

## Area
primary-synai

## Role
canonical

## Purpose
Electron main-process orchestration and side-effect boundary.

## Main Imports
- @contracts
- electron

## Main Exports
- none

## Likely Side Effects
filesystem, IPC, desktop/workflow orchestration, and runtime side effects

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/preload.js

## Edit Risk
high

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
