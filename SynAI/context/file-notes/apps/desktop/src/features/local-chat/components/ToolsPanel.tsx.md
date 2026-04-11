<!-- source-hash:cf3d7c8b403237f13593d424bfc8b68c8fe6c7c536a03d3979a463012e941361; note-hash:58c8c1c45d78dd5a7fae470f60ecb45c2326b6471b2bbb32aeba7056ad3f5b6f -->
# SynAI/apps/desktop/src/features/local-chat/components/ToolsPanel.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/ToolsPanel.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ../../../shared/components/Badge
- ../../../shared/components/Button
- ../../../shared/components/Card
- ../../../shared/utils/cn
- ../../feature-registry
- ../../memory/components/MemoryPanel
- ../types/localChat.types
- ../types/localChat.types

## Main Exports
- ToolsPanel

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/feature-registry.ts
- SynAI/apps/desktop/src/features/local-chat/components/AgentRuntimeCard.tsx
- SynAI/apps/desktop/src/features/local-chat/components/ChatControls.tsx
- SynAI/apps/desktop/src/features/local-chat/components/ContextPreview.tsx
- SynAI/apps/desktop/src/features/local-chat/components/DesktopActionsCard.tsx
- SynAI/apps/desktop/src/features/local-chat/components/LocalModelStatus.tsx
- SynAI/apps/desktop/src/features/local-chat/components/MemoryInspector.tsx
- SynAI/apps/desktop/src/features/local-chat/components/PromptEvaluationCard.tsx

## Edit Risk
medium

## Edit Guidance
Keep renderer changes narrow and avoid changing governed semantics in UI-only code.

## Likely Tests Affected
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
- SynAI/tests/capability/approval-gate.test.ts
- SynAI/tests/capability/approval-ledger.test.js
- SynAI/tests/capability/approval-ledger.test.ts
- SynAI/tests/capability/artifact-store.test.js
