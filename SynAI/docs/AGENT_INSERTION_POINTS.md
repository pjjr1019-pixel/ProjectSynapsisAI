# SynAI Agent Insertion Points

Read this before adding new behavior.

## Canonical

- `packages/Agent-Runtime/src/` is the canonical agent runtime source tree.
- `@agent-runtime` is the preferred import surface for new code.
- `packages/Governance-Execution/src/` is the governed policy and execution layer.
- `apps/desktop/electron/` owns privileged main-process orchestration and IPC.

## Compatibility Only

- `@synai-agent` exists only as a thin compatibility alias over the canonical runtime package.
- `packages/Agent-Runtime/vitest/agent/` is the compatibility test surface for that alias.

## Runtime Only

- `.runtime/`, `out/`, `dist/`, `coverage/`, and installed `node_modules/` trees are generated or local-only.
- Keep generated state out of canonical source and out of review diffs.

## Safe Extension Points

- `packages/Agent-Runtime/src/<subsystem>/` for runtime helpers that preserve contracts.
- `packages/Awareness-Reasoning/src/memory/` for memory and retrieval changes.
- `apps/desktop/src/features/*` for renderer UI only.
- `docs/` for short support docs, ADRs, and boundary notes.

## Invariants

- Approval tokens stay bound to the exact normalized command hash.
- Audit logging stays append-only.
- Governed desktop actions default to preview-first behavior.
- File operations only use explicitly approved absolute roots.
- Denied outcomes stay distinct from blocked and simulated outcomes.

## Out Of Phase 1

- Finance
- Cloud sync
- Launcher/dashboard expansion
- Broad multi-agent expansion
- Any direct destructive system automation that skips governance
