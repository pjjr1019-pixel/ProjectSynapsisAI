# SynAI Agent Runtime Foundation

## Purpose
Provide a typed, auditable, no-op agent runtime that can be wired into SynAI without touching the existing chat, memory, or workflow features. The goal of Prompt 1 is foundation only: contracts, module boundaries, a safe execution path, and one clean app entry point.

## Current Scope
- Canonical contracts live in `src/agent/contracts/agent-runtime.contracts.ts`.
- The runtime foundation lives in `src/agent/*`.
- SynAI exposes a bridge under `SynAI/src/agent/*`.
- The app entry point is one IPC handler in `SynAI/apps/desktop/electron/main.ts`.
- The runtime only uses mock skills and never performs real Windows or browser automation.

## Module Boundaries
- `agent/core`: task, context, job, checkpoint, and ID helpers.
- `agent/planner`: chooses the single mock step for a task.
- `agent/executor`: resolves a skill and validates its input and result.
- `agent/verifier`: checks the typed postconditions for the executed step.
- `agent/perception`: captures a typed observation snapshot.
- `agent/policy`: decides allow, block, or escalate.
- `agent/runtime`: orchestrates the no-op flow and returns the final typed result.
- `agent/skills`: skill registry plus safe mock skills.
- `agent/audit`: in-memory audit event helpers and store.
- `agent/evals`: small evaluation fixtures for the runtime foundation.

## No-Op Task Lifecycle
1. A typed `AgentTask` enters the runtime.
2. The planner selects one safe mock step.
3. Policy evaluates the task and either allows, blocks, or escalates it.
4. If allowed, the executor runs the mock skill.
5. The perception layer captures the execution snapshot.
6. The verifier checks the typed postconditions.
7. Audit events are emitted for each stage.
8. The runtime returns a typed final result plus the job checkpoint.

## Intentionally Not Implemented Yet
- Real agent planning or multi-step reasoning
- Persistent job or checkpoint storage
- Retry, resume, and cancellation orchestration
- Real Windows automation
- Browser automation
- UI controls for invoking the runtime
- Production skill marketplace or plugin loading

## Repo Insertion Point
- Keep the runtime implementation in `src/agent`.
- Keep SynAI-facing imports behind `SynAI/src/agent` bridges.
- Use the existing Electron main process IPC layer as the only app entry point for now.

## Prompt 2 Recommendation
Persist runtime jobs, checkpoints, and audit trails, then add a minimal renderer-facing surface to invoke and inspect the agent runtime result.

