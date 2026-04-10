# 02 - Perception Grounding

## Purpose
Capture grounded snapshots of the world and of execution state so later layers can verify what happened instead of guessing.

## Current Non-Goals
- No real Windows automation.
- No planner, executor, or runtime loop logic.
- No policy decisions.
- No UI-specific layout work beyond data that the UI can render.

## Intended Boundaries
- Observation stays read-only.
- Snapshots should be replayable, serializable, and comparison-friendly.
- Grounding data should describe machine, file, screen, and web state without mutating it.

## Core Interfaces / Contracts Expected
- Observation snapshot.
- Grounding summary or reasoning trace summary.
- Context preview payload.
- Machine, file, and screen awareness snapshots.
- Replayable evidence records and source metadata.

## Minimal V1 Success Criteria
- One execution attempt produces a snapshot with stable ids and timestamps.
- Grounding can explain what evidence was used.
- The UI and the data model agree on the same snapshot fields.
- Before/after state can be compared without side effects.

## Minimum Tests / Evals Expected
- Snapshot serialization and parse round-trip.
- Context assembly / preview tests.
- Grounding UI smoke coverage.
- Evidence-source ordering or ranking checks.

## Dependencies
depends_on_layers:
  - "01-action-substrate"
  - "05-policy-audit-evals"
provides_to_layers:
  - "03-planner-executor-verifier"
  - "04-autonomy-runtime"
  - "05-policy-audit-evals"
