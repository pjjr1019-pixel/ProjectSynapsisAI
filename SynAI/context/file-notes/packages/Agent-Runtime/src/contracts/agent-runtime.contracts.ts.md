<!-- source-hash:e2e8e56f342d44a56fc5933cbae6638acc5675778c9f882c0cafc9d48cca83fa; note-hash:bf2a5f8bda8f61db2b07cd7d0c414df8e41742e3e3f8b30937414d78a32db803 -->
# SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts

## Path
SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical runtime contract surface.

## Main Imports
- zod

## Main Exports
- ActionProposal
- ActionProposalCapabilityStatus
- ActionProposalCapabilityStatusSchema
- ActionProposalCapabilityStatusSchema
- ActionProposalSchema
- ActionProposalSchema
- ActionRequest
- ActionRequestKind

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.js
- SynAI/packages/Agent-Runtime/vitest/agent/contracts/agent-runtime.contracts.test.js
- SynAI/packages/Agent-Runtime/vitest/agent/contracts/agent-runtime.contracts.test.ts

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
