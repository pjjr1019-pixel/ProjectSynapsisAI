<!-- source-hash:ae48f84447ec48aa2e9a975131f2f0864e2a1010896381524ac796025f756a75; note-hash:92c220cb1e8912c679eb0792a10b1e2d573ad22da8da5775fda92705b6ad982a -->
# SynAI/packages/Agent-Runtime/src/contracts/index.ts

## Path
SynAI/packages/Agent-Runtime/src/contracts/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical runtime contract surface.

## Main Imports
- none

## Main Exports
- re-export
- re-export

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
