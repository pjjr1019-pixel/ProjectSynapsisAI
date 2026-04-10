# Prompt 1 Foundation Pack

## Objective
Keep the repo support layer accurate, compact, and future-agent-friendly without changing product behavior.

## Files To Read First
- `context/AGENT_GUIDE.md`
- `context/REPO_MAP.yaml`
- `context/BLAST_RADIUS_MANIFEST.yaml`
- `context/GLOSSARY.yaml`
- `docs/decisions/ADR-001-agent-contract-ownership.md`
- `docs/decisions/ADR-002-runtime-entrypoint-selection.md`
- `docs/decisions/ADR-003-foundation-before-real-automation.md`
- `specs/agent/01-action-substrate.md`
- `specs/agent/05-policy-audit-evals.md`

## Files Not To Touch Casually
- `SynAI/apps/desktop/electron/main.ts`
- `SynAI/apps/desktop/electron/workflow-orchestrator.ts`
- `SynAI/packages/Governance and exicution/src/policy/engine.ts`
- `SynAI/packages/Awareness-Reasoning/src/memory/context/assembler.ts`
- `src/agent/contracts/agent-runtime.contracts.ts`

## Acceptance Criteria
- The support layer is concise, accurate, and specific to the current repo shape.
- No app behavior changes.
- No fake implementation stubs.
- The validation script passes cleanly.

## Validation Command
- `.\scripts\validate-agent-foundation.ps1`
