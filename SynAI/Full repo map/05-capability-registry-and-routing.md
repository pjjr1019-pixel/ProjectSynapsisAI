# 05-Capability Registry and Routing

## Routing Files (VERIFIED)
- packages/Governance-Execution/src/governed-chat/router.ts: Main routing logic
- packages/Awareness-Reasoning/src/runtime-capabilities.ts: Capability registry and lookup
- packages/Governance-Execution/src/governed-chat/types.ts: Routing contracts/types

## Workflow/Action Routing (VERIFIED)
- Governed chat router delegates to capability lookup and executor
- Phase 6 router (partial, see TODO)

## Intent Classification (VERIFIED/INFERENCE)
- Simple heuristics in router.ts (VERIFIED)
- TODO: Deep audit for NLU/ML-based intent detection

## Unsupported/Clarify/Gap Handling (VERIFIED)
- Unsupported/clarify events emitted in router.ts and improvement/analyzer.ts
- Dedupe/rate-limiting logic in improvement/analyzer.ts

## Phase 6 Spine (INFERENCE)
- Phase 6 router and trace logic is present but partial

## TODO
- Map all capability registry sources and adapters
- Deep audit of routing fallback/legacy paths
- Verify all unsupported/clarify event flows
