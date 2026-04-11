# Policy Audit Pack

## Objective
Prepare layer 5 work so future prompts can harden policy, audit, and eval behavior without breaking the rest of the runtime.

## Files To Read First
- `SynAI/packages/Agent-Runtime/specs/05-policy-audit-evals.md`
- `SynAI/docs/decisions/ADR-001-agent-contract-ownership.md`
- `SynAI/docs/decisions/ADR-003-foundation-before-real-automation.md`
- `SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts`
- `SynAI/packages/Agent-Runtime/tests/policy/policy.test.ts`
- `SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts`
- `SynAI/packages/Governance-Execution/src/policy/engine.ts`
- `SynAI/packages/Governance-Execution/src/approvals/ledger.ts`
- `SynAI/packages/Governance-Execution/src/audit/query.ts`
- `SynAI/tests/capability/policy-engine.test.ts`
- `SynAI/tests/capability/governance-command-bus.test.ts`
- `SynAI/tests/capability/approval-gate.test.ts`

## Files Not To Touch Casually
- `SynAI/apps/desktop/electron/main.ts`
- `SynAI/apps/desktop/electron/workflow-orchestrator.ts`
- `SynAI/packages/Awareness-Reasoning/src/memory/storage/*`

## Acceptance Criteria
- Every side effect gets a policy decision.
- Every decision gets an audit event.
- Eval outputs can explain why a case passed, blocked, or escalated.
- Approval or promotion gates stay explicit.

## Validation Command
- `cd SynAI; npx vitest run tests/capability/policy-engine.test.ts tests/capability/governance-command-bus.test.ts tests/capability/approval-gate.test.ts`
