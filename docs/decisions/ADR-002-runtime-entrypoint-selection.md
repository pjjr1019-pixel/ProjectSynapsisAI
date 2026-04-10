# ADR-002: Runtime Entrypoint Selection

## Context
SynAI already has a real Electron main process, IPC wiring, and app-level orchestration. The agent runtime is not a renderer concern, and direct renderer-side side effects would make safety and testing much harder.

## Decision
Use the Electron main process as the runtime entrypoint boundary. Keep `agentRuntimeRun` and any future agent orchestration behind IPC or a main-process service module. The renderer may request work, but it should not own execution.

## Consequences
- Privileged operations stay in one place.
- IPC becomes the integration seam for future agent layers.
- The renderer stays easier to test and less coupled to platform state.

## What Future Prompts Should Assume
Assume agent execution enters through the main process, not through React components or ad hoc renderer helpers. If a new entrypoint is needed, it should wrap the same runtime service instead of duplicating it.
