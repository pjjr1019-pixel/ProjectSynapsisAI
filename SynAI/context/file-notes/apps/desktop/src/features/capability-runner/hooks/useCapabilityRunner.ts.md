<!-- source-hash:7a7d0d080917521015459d1794711433ea369d66257da9a63f13a248e9490b5e; note-hash:1a7b0759f402d1143f5efaeb12b4b113a8dbe80aae6d0a9e774084b1e9eaa067 -->
# SynAI/apps/desktop/src/features/capability-runner/hooks/useCapabilityRunner.ts

## Path
SynAI/apps/desktop/src/features/capability-runner/hooks/useCapabilityRunner.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts
- react

## Main Exports
- useCapabilityRunner
- useCapabilityRunner

## Likely Side Effects
application state updates

## State Touched
unknown

## Related Files
- none identified

## Edit Risk
medium

## Edit Guidance
Keep renderer changes narrow and avoid changing governed semantics in UI-only code.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
