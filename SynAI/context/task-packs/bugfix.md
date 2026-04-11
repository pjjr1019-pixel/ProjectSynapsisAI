<!-- doc:task-pack:bugfix; input-hash:89a4c6fd1a8f0422eeff5a27af307bdf64db5cf5a85707999dab1d88d0a558f5 -->
# Bugfix Pack

## Inspect First
- The failing feature surface under `apps/desktop/electron`, `apps/desktop/src/features`, or the relevant `packages/*/src` area.
- Shared contracts in `packages/Awareness-Reasoning/src/contracts` and `packages/Agent-Runtime/src/contracts` if any status or payload field is involved.

## Relevant Tests
- Start with the narrow capability/runtime test nearest the failing surface.
- For governed execution semantics use `tests/capability/desktop-actions-clarification.test.ts`, `tests/capability/governed-chat-service.test.ts`, and `tests/capability/workflow-orchestrator.test.ts`.

## Keep Narrow
- Prefer `SynAI/` edits over root-shell edits.
- Do not casually delete TS/JS twins; use documented canonical candidates and leave ambiguity documented if proof is weak.
- Refresh deterministic context after structural changes with `npm run context:build`.

