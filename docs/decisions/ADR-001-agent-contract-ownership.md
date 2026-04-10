# ADR-001: Agent Contract Ownership

## Context
The repo has a canonical root agent foundation in `src/agent/` and a compatibility re-export layer in `SynAI/src/agent/`. The app, tests, and future implementation passes need one clear source of truth for runtime schemas and shared types.

## Decision
Treat `src/agent/contracts/agent-runtime.contracts.ts` as the authoritative contract surface. Keep `SynAI/src/agent/` as a thin re-export layer unless the app needs a compatibility bridge. Any contract change must update the root tests and the SynAI shim test in the same pass.

## Consequences
- Contract drift becomes easier to spot.
- Future prompts can rely on the root contract file without guessing where the real schema lives.
- App-facing imports stay stable even if the canonical root implementation evolves.

## What Future Prompts Should Assume
Assume the root `src/agent` tree owns the contracts. Assume the SynAI shim exists only for compatibility. Do not move logic into the shim.
