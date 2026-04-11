<!-- doc:task-pack:governed-actions; input-hash:61d2d5f71452d228686e8302a6f7f9396668b560e6ea96b8643d409bd5e5e32e -->
# Governed Actions Pack

## Inspect First
- `apps/desktop/electron/governed-chat.ts`
- `apps/desktop/electron/workflow-orchestrator.ts`
- `apps/desktop/electron/desktop-actions.ts`
- `apps/desktop/electron/agent-runtime-adapters.ts`
- `packages/Awareness-Reasoning/src/contracts/chat.ts` and `ipc.ts`

## Must Preserve
- `clarification_needed`, `blocked`, `failed`, `completed`, and pending/running semantics as distinct states.
- Human-readable clarification prompts and any `missingFields` detail.
- Approval/denial/rollback metadata.

## Relevant Tests
- `tests/capability/desktop-actions-clarification.test.ts`
- `tests/capability/governed-chat-service.test.ts`
- `tests/capability/workflow-orchestrator.test.ts`

## Keep Narrow
- Prefer `SynAI/` edits over root-shell edits.
- Do not casually delete TS/JS twins; use documented canonical candidates and leave ambiguity documented if proof is weak.
- Refresh deterministic context after structural changes with `npm run context:build`.

