# 01 - Action Substrate

## Purpose
Define the Windows action surface as a typed substrate that can normalize a request, bind approval, and return a structured result without pretending real automation exists yet.

## Current Non-Goals
- No real Windows automation.
- No renderer-owned side effects.
- No planner, perception, or runtime orchestration logic.
- No hidden shell commands, process kills, or file mutations outside explicit adapters.

## Intended Boundaries
- Platform-specific work stays behind explicit adapters.
- Requests, proposals, approvals, and results stay typed and serializable.
- Dry-run, preview, and rollback metadata must remain first-class.

## Core Interfaces / Contracts Expected
- Normalized action request and proposal types.
- Action result with explicit executed, simulated, blocked, or denied states.
- Adapter interface for Windows-specific execution.
- Catalog or registry for supported actions.
- Approval-token binding to command hashes.
- Rollback or compensation metadata for destructive actions.

## Minimal V1 Success Criteria
- A request can become a proposal without side effects.
- Approval can be attached to the exact normalized command.
- Dry-run and live result shapes stay consistent.
- Every destructive action carries a reason and rollback signal.

## Minimum Tests / Evals Expected
- Catalog lookup and normalization.
- Approval binding to command hash.
- Dry-run versus live result parity.
- Blocked, denied, and rollback cases.

## Dependencies
depends_on_layers: []
provides_to_layers:
  - "02-perception-grounding"
  - "03-planner-executor-verifier"
  - "04-autonomy-runtime"
  - "05-policy-audit-evals"
