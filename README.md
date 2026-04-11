# Horizons.AI Repository Shell

This repository root is a bootstrap shell, not a second app package.

The actual SynAI app, package scripts, and runtime entry points live in `SynAI/`.

## Working In This Repo

1. `cd SynAI`
2. Install dependencies and run the app or tests from there.
3. Treat the root-level files as coordination and hygiene files only:
   - `.gitignore`
   - this README
   - repo automation or editor metadata

## Ownership Model

- `SynAI/` is the app/package root.
- `@agent-runtime` is the preferred canonical runtime import surface.
- `SynAI/packages/Agent-Runtime/src/` is the canonical agent runtime surface.
- `@synai-agent` is compatibility-only.
- `packages/Governance-Execution` is the governed policy and execution layer.

Keep new work inside `SynAI/` unless you are explicitly changing repo bootstrap or hygiene.
