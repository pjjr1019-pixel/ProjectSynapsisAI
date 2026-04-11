<!-- source-hash:9569161404fa2ca102df79c40ca8a656c156e8b74a381b47e71b944efa82c77f; note-hash:71fffb8eb7e707210ee26537c556405bc2892c2319fb901bfebb9cb6baf408c5 -->
# SynAI/packages/Governance-Execution/src/commands/bus.ts

## Path
SynAI/packages/Governance-Execution/src/commands/bus.ts

## Area
primary-synai

## Role
support

## Purpose
Governed execution policy/orchestration module.

## Main Imports
- ../approvals/ledger
- ../contracts
- ../policy/engine
- ./hash
- node:crypto
- node:fs/promises
- node:path

## Main Exports
- createGovernanceCommandBus
- createGovernanceCommandBus
- enqueueGovernanceCommand
- enqueueGovernanceCommand
- getGovernanceCommandStatus
- getGovernanceCommandStatus
- GovernanceCommandBusOptions
- processNextGovernanceCommand

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Governance-Execution/src/approvals/ledger.ts
- SynAI/packages/Governance-Execution/src/commands/bus.js
- SynAI/packages/Governance-Execution/src/commands/hash.ts
- SynAI/packages/Governance-Execution/src/contracts.ts
- SynAI/packages/Governance-Execution/src/policy/engine.ts
- SynAI/tests/capability/governance-command-bus.test.js
- SynAI/tests/capability/governance-command-bus.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/tests/capability/governance-command-bus.test.js
- SynAI/tests/capability/governance-command-bus.test.ts
