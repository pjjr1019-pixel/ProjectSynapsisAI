# ADR-001: Agent Contract Ownership

## Context
The repo has a canonical agent runtime package in `SynAI/packages/Agent-Runtime/src/` and a compatibility import surface exposed through `@synai-agent`. The app, tests, and future implementation passes need one clear source of truth for runtime schemas and shared types.

## Decision
Treat `SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts` as the authoritative contract surface. Keep `@synai-agent` as a thin compatibility alias unless the app needs a compatibility bridge. Any contract change must update the package tests and the SynAI compatibility test in the same pass.

## Consequences
- Contract drift becomes easier to spot.
- Future prompts can rely on the canonical package contract file without guessing where the real schema lives.
- App-facing imports stay stable even if the canonical root implementation evolves.

## What Future Prompts Should Assume
Assume `SynAI/packages/Agent-Runtime/src` owns the contracts. Assume `@synai-agent` exists only for compatibility. Do not create a second implementation behind it.
