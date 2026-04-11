<!-- doc:BLAST_RADIUS; input-hash:53d0bd0d7dcc4f7d177829026f9f473fd8a5b5cd328c483a883de9a70ba33f1f -->
# SynAI Blast Radius

## High Risk
- `SynAI/apps/desktop/electron/governed-chat.ts`, `workflow-orchestrator.ts`, and `desktop-actions.ts`: execution semantics, approvals, clarification, rollback, and policy-visible behavior.
- `SynAI/apps/desktop/electron/agent-runtime-adapters.ts` and `SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts`: shared runtime status/contract behavior.
- `SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts` and `ipc.ts`: renderer/main-process contracts.

## Medium Risk
- `SynAI/apps/desktop/src/features/local-chat/*`: UI rendering and task-state presentation.
- `SynAI/packages/Awareness-Reasoning/src/*`: memory, retrieval, awareness, and context assembly.
- `SynAI/scripts/context/*`: deterministic context generation.

## Focused Validation
- Clarification/governed execution: `tests/capability/desktop-actions-clarification.test.ts`, `tests/capability/governed-chat-service.test.ts`, `tests/capability/workflow-orchestrator.test.ts`.
- Runtime contracts/status: `packages/Agent-Runtime/tests/runtime/runtime.noop.test.ts` plus any adapter/status contract test added for this pass.
- Context pipeline: `tests/context/context-pipeline.test.ts`.

