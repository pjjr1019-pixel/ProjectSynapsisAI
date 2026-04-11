<!-- doc:task-pack:refactor; input-hash:e504f69d50211a31cecb16fee72e3e61023b2a1b851fc5cd69eadb6f314c69f5 -->
# Refactor Pack

## Inspect First
- `REPO_MAP.md` and `BLAST_RADIUS.md` for shared boundaries.
- Imports/exports artifacts to avoid widening changes across packages.

## Do Not Touch Casually
- `packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts`
- `packages/Awareness-Reasoning/src/contracts/chat.ts` and `ipc.ts`
- `apps/desktop/electron/governed-chat.ts`, `workflow-orchestrator.ts`, `desktop-actions.ts`

## Keep Narrow
- Prefer `SynAI/` edits over root-shell edits.
- Do not casually delete TS/JS twins; use documented canonical candidates and leave ambiguity documented if proof is weak.
- Refresh deterministic context after structural changes with `npm run context:build`.

