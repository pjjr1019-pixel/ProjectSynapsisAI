# 05 - Policy, Audit, and Evals

## Purpose
Define the safety and accountability layer that classifies risk, makes allow/block/escalate decisions, records audit events, and runs deterministic evaluations.

## Current Non-Goals
- No extra execution surfaces.
- No hidden policy bypass.
- No vague safety labels without concrete consequences.
- No replacement for the lower layers.

## Intended Boundaries
- Policy decides before side effects.
- Audit is append-only and replay-friendly.
- Eval tooling should explain decisions and regressions, not just mark pass/fail.
- Promotion or approval gates must be explicit and test-backed.

## Core Interfaces / Contracts Expected
- Policy decision.
- Risk level and side-effect classification.
- Audit event and audit query shape.
- Approval token or promotion gate.
- Evaluation case, response, and report.

## Minimal V1 Success Criteria
- Every side effect has a policy decision.
- Every decision has a corresponding audit event.
- Evals can replay a decision and explain why it passed or failed.
- Allow/block/escalate behavior is deterministic.

## Minimum Tests / Evals Expected
- Policy engine tests.
- Approval gate tests.
- Audit append and query tests.
- Eval runner and report tests.

## Dependencies
depends_on_layers:
  - "01-action-substrate"
  - "02-perception-grounding"
  - "03-planner-executor-verifier"
  - "04-autonomy-runtime"
provides_to_layers:
  - "01-action-substrate"
  - "02-perception-grounding"
  - "03-planner-executor-verifier"
  - "04-autonomy-runtime"
