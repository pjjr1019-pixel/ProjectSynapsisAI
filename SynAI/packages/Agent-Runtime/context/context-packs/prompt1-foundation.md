# Prompt 1 Foundation Pack

## Objective
Keep the repo support layer accurate, compact, and future-agent-friendly without changing product behavior.

## Files To Read First
- `SynAI/packages/Agent-Runtime/context/AGENT_GUIDE.md`
- `SynAI/packages/Agent-Runtime/context/REPO_MAP.yaml`
- `SynAI/packages/Agent-Runtime/context/BLAST_RADIUS_MANIFEST.yaml`
- `SynAI/packages/Agent-Runtime/context/GLOSSARY.yaml`
- `SynAI/docs/decisions/ADR-001-agent-contract-ownership.md`
- `SynAI/docs/decisions/ADR-002-runtime-entrypoint-selection.md`
- `SynAI/docs/decisions/ADR-003-foundation-before-real-automation.md`
- `SynAI/packages/Agent-Runtime/specs/01-action-substrate.md`
- `SynAI/packages/Agent-Runtime/specs/05-policy-audit-evals.md`

## Files Not To Touch Casually
- `SynAI/apps/desktop/electron/main.ts`
- `SynAI/apps/desktop/electron/workflow-orchestrator.ts`
- `SynAI/packages/Governance and exicution/src/policy/engine.ts`
- `SynAI/packages/Awareness-Reasoning/src/memory/context/assembler.ts`
- `SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts`

## Acceptance Criteria
- The support layer is concise, accurate, and specific to the current repo shape.
- No app behavior changes.
- No fake implementation stubs.
- The validation script passes cleanly.

## Validation Command
- `cd SynAI; .\packages\Agent-Runtime\scripts\validate-agent-foundation.ps1`
