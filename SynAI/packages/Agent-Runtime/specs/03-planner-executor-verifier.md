# 03 - Planner, Executor, Verifier

## Purpose
Turn a task into a small plan, run the plan through an execution adapter, and verify the result against explicit expectations.

## Current Non-Goals
- No durable scheduler or queue.
- No real Windows automation.
- No multi-agent coordination.
- No policy engine rewrite.

## Intended Boundaries
- Planner owns decomposition.
- Executor owns running one planned step through an adapter.
- Verifier owns outcome checking and mismatch reporting.
- Step state transitions must stay explicit and auditable.

## Core Interfaces / Contracts Expected
- Task, step, and plan shapes.
- Execution attempt or execution outcome.
- Verification report with issues and status.
- Retry, skip, and failure metadata.
- Deterministic step ids and result ids.

## Minimal V1 Success Criteria
- One task can become one plan, one execution attempt, and one verification report.
- Failures are explicit, typed, and explainable.
- Skip/block/escalate paths remain visible in the result model.
- Planner, executor, and verifier stay separable.

## Minimum Tests / Evals Expected
- Planner unit tests.
- Executor adapter tests.
- Verifier mismatch and failure tests.
- End-to-end no-op runtime tests.

## Dependencies
depends_on_layers:
  - "01-action-substrate"
  - "02-perception-grounding"
  - "05-policy-audit-evals"
provides_to_layers:
  - "04-autonomy-runtime"
  - "05-policy-audit-evals"
