# ADR-003: Foundation Before Real Automation

## Context
The repo already has typed contracts, mock skills, preview paths, and governed desktop scaffolding. The next agent layers will eventually need real Windows action, perception grounding, durable runtime orchestration, and policy/audit/eval coverage.

## Decision
Do not add real Windows automation until the contract layer, planner/executor/verifier flow, policy/audit layer, and focused tests are in place. Keep current behavior mock-backed or dry-run-first until the support layer and later specs are satisfied.

## Consequences
- The repo stays safe to iterate on.
- Future work has to prove shape, policy, and audit behavior before side effects are enabled.
- The project avoids fake completeness and brittle automation stubs.

## What Future Prompts Should Assume
Assume previews, mocks, and no-op adapters are intentional. Do not turn a spec into live OS automation just because the interface exists.
