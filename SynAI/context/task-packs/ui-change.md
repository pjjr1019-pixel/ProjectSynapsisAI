<!-- doc:task-pack:ui-change; input-hash:0451b44516cb7450f435a002f9f7364e5b743e1e1ed6d2aec6dc4fbf2f854c4e -->
# UI Change Pack

## Inspect First
- `apps/desktop/src/features/local-chat/components/*` and supporting hooks/store files.
- `packages/Awareness-Reasoning/src/contracts/chat.ts` if task-state rendering depends on new metadata fields.

## Relevant Tests
- Renderer smoke tests under `tests/smoke/*`.
- Capability tests if the UI reflects governed execution or runtime state.

## Keep Narrow
- Prefer `SynAI/` edits over root-shell edits.
- Do not casually delete TS/JS twins; use documented canonical candidates and leave ambiguity documented if proof is weak.
- Refresh deterministic context after structural changes with `npm run context:build`.

