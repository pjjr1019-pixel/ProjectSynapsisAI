<!-- source-hash:849c7457133e0f5f4e01545d29a2b7776b1f03418ea6a094671bfdad8e0f9154; note-hash:b10fdde09215cd29501997200d7990c7454baefc4426ec7ede94b2ec4d182b4f -->
# SynAI/apps/desktop/src/App.tsx

## Path
SynAI/apps/desktop/src/App.tsx

## Area
primary-synai

## Role
duplicate-candidate

## Purpose
Renderer-side desktop UI module.

## Main Imports
- ./features/local-chat/components/HistoryPanel
- ./features/local-chat/components/SettingsPanel
- ./features/local-chat/components/ToolsPanel
- ./features/local-chat/components/ChatPanel
- ./features/local-chat/components/WorkspaceTabs
- ./features/local-chat/hooks/useLocalChat
- ./features/local-chat/types/localChat.types
- ./features/local-chat/utils/conversationTurns

## Main Exports
- default

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/src/App.js
- SynAI/apps/desktop/src/features/local-chat/components/ChatPanel.tsx
- SynAI/apps/desktop/src/features/local-chat/components/HistoryPanel.tsx
- SynAI/apps/desktop/src/features/local-chat/components/SettingsPanel.tsx
- SynAI/apps/desktop/src/features/local-chat/components/ToolsPanel.tsx
- SynAI/apps/desktop/src/features/local-chat/components/WorkspaceTabs.tsx
- SynAI/apps/desktop/src/features/local-chat/hooks/useLocalChat.ts
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts

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
