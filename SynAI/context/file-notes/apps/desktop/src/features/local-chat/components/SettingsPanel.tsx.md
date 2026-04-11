<!-- source-hash:298ca90dec266b9e7cb8ccf24464543ed5a066e03ad1e335a094d1867fd84325; note-hash:d72418966d9d105dfcb8a6e5a6d61c31f8845f7ca66dccf31169589160b3533a -->
# SynAI/apps/desktop/src/features/local-chat/components/SettingsPanel.tsx

## Path
SynAI/apps/desktop/src/features/local-chat/components/SettingsPanel.tsx

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
- ../../../shared/components/Input
- ../../feature-registry
- ../types/localChat.types
- ./ChatSettings
- @contracts

## Main Exports
- SettingsPanel

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/feature-registry.ts
- SynAI/apps/desktop/src/features/local-chat/components/ChatSettings.tsx
- SynAI/apps/desktop/src/features/local-chat/components/SettingsPanel.js
- SynAI/apps/desktop/src/features/local-chat/types/localChat.types.ts
- SynAI/apps/desktop/src/shared/components/Badge.tsx
- SynAI/apps/desktop/src/shared/components/Button.tsx
- SynAI/apps/desktop/src/shared/components/Card.tsx
- SynAI/apps/desktop/src/shared/components/Input.tsx

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
