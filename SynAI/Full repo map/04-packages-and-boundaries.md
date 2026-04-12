# 04-Packages and Boundaries

## Packages (VERIFIED)
- Agent-Runtime: agent execution, runtime state, skills, audit, planner, verifier
- Awareness-Reasoning: context, capability registry, improvement, memory, model, reasoning, retrieval, screen, web-search
- Capability-Catalog: capability schemas, cards, retrieval, unified runner
- Governance-Execution: governed chat, router, types, execution, policy, audit, approvals, remediation

## Responsibilities
- Each package owns its core logic and contracts (VERIFIED)
- Some boundaries are clean (e.g., Agent-Runtime vs Awareness-Reasoning)
- Some are muddy (e.g., capability registry and routing logic overlap)

## Central vs Wrapper/Leftover
- Central: Agent-Runtime, Awareness-Reasoning, Governance-Execution (VERIFIED)
- Wrapper/Leftover: Capability-Catalog (INFERENCE)

## TODO
- Deep audit of cross-package imports and boundary violations
- Map any duplicate or orphaned logic
