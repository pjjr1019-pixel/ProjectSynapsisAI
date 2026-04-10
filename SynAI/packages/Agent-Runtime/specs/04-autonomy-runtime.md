# 04 - Autonomy Runtime

## Purpose
Provide the durable runtime shell that can start, checkpoint, resume, cancel, and recover jobs without losing auditability.

## Current Non-Goals
- No cross-device sync.
- No distributed job scheduling.
- No hidden daemon behavior.
- No real Windows automation.

## Intended Boundaries
- Runtime owns lifecycle, not planning semantics.
- Checkpoints must be serializable and resumable.
- Progress events and lifecycle state should be observable from the outside.
- Persistence belongs to the runtime layer, not the renderer.

## Core Interfaces / Contracts Expected
- Runtime job.
- Runtime checkpoint.
- Resume or continuation token.
- Job lifecycle and progress events.
- Durable state or queue abstraction.

## Minimal V1 Success Criteria
- A job can start, checkpoint, resume, and complete or fail deterministically.
- Cancellation leaves an auditable trail.
- Recovery does not lose the last known good state.
- Job state can be inspected without re-running side effects.

## Minimum Tests / Evals Expected
- Job lifecycle tests.
- Checkpoint round-trip tests.
- Resume and cancel tests.
- Failure recovery tests.

## Dependencies
depends_on_layers:
  - "01-action-substrate"
  - "02-perception-grounding"
  - "03-planner-executor-verifier"
  - "05-policy-audit-evals"
provides_to_layers:
  - "05-policy-audit-evals"
