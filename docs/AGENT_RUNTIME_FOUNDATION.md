# SynAI Agent Runtime Foundation

## Purpose
Provide the canonical root architecture for the typed SynAI agent runtime. The runtime now includes the original foundation plus the smallest real 5-layer implementation that can be wired into SynAI without breaking existing chat, memory, workflow, governance, or eval behavior.

## Current Scope
- Canonical contracts live in `src/agent/contracts/agent-runtime.contracts.ts`.
- The canonical runtime implementation lives in `src/agent/*`.
- `SynAI/src/agent/*` remains a thin compatibility shim.
- The Electron main process owns the privileged runtime entry points and persistence.
- The preload bridge exposes safe runtime invocation and inspection methods.
- The renderer exposes a compact operator view for runtime jobs, policy, verification, audit, and checkpoints.
- The chat context preview now exposes a compact read-only runtime summary without moving privileged behavior into the renderer.
- The runtime can stay mock-backed or route through existing governed SynAI adapters when they are available.

## Module Boundaries
- `agent/core`: task, context, job, checkpoint, and ID helpers.
- `agent/planner`: produces typed multi-step plans with explicit observe, execute, and verify stages.
- `agent/executor`: normalizes action requests, proposals, adapters, attempts, and results.
- `agent/verifier`: checks typed postconditions and records structured issues.
- `agent/perception`: captures replay-friendly observation snapshots and evidence.
- `agent/policy`: decides allow, block, or escalate before any meaningful side effect.
- `agent/runtime`: orchestrates jobs, checkpoints, progress, inspection, resume, cancel, and recover.
- `agent/skills`: safe mock skills plus adapter-compatible skill execution.
- `agent/audit`: append-only audit event helpers plus in-memory and file-backed stores.
- `agent/evals`: deterministic evaluation cases and suite runner for the runtime stack.

## Runtime Lifecycle
1. A typed `AgentTask` enters the runtime.
2. The planner emits a typed plan and normalized action request.
3. The policy layer evaluates the proposal and either allows, blocks, or escalates it.
4. If the plan requires clarification, the runtime terminates with `clarification_needed` before execution and checkpoints that state explicitly.
5. If live execution needs approval, the runtime validates the bound approval token against the normalized command hash before any adapter side effect runs.
6. If allowed, the executor runs a safe adapter or mock skill and records an execution attempt.
7. The perception layer captures before and after evidence.
8. The verifier produces a structured verification report.
9. Audit events and checkpoints are appended through the runtime lifecycle and exposed through the governance audit query surface.
10. The runtime returns the task, execution context, job, plan, observations, policy decision, verification, result, audit trail, and checkpoint.

## Intentionally Still Out Of Scope
- Broad destructive live automation without explicit governed adapters
- Renderer-owned privileged execution
- Opaque self-healing or self-improvement claims
- Full autonomous replanning loops beyond the current typed plan pipeline
- Production-grade approval UX beyond the existing governed execution surfaces
- Exact full-environment replay beyond captured checkpoint and audit reconstruction

## Repo Insertion Point
- Keep the runtime implementation in `src/agent`.
- Keep SynAI-facing imports behind `SynAI/src/agent` bridges.
- Keep the Electron main process as the only privileged app entry point.

## Next Recommendation
Expand the live adapter matrix one governed surface at a time, then deepen replay, approval UX, and eval coverage around the persisted runtime artifacts.
