<!-- source-hash:66fd71fe4103529f14ad6f76008be9ef6ff9f0c11227fca0e954646dc4935bc8; note-hash:5be7e266514dfc4b0851d4a3d1f868683dec568dcf9b0a7d6624b4e959f65d21 -->
# SynAI/apps/desktop/src/shared/utils/id.ts

## Path
SynAI/apps/desktop/src/shared/utils/id.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- none

## Main Exports
- createId
- createId

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.test.ts
- SynAI/apps/desktop/src/shared/utils/id.js
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.ts

## Edit Risk
medium

## Edit Guidance
Keep renderer changes narrow and avoid changing governed semantics in UI-only code.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.ts
- SynAI/tests/capability/agent-runtime-adapters.test.ts
- SynAI/tests/capability/agent-runtime-approval.test.js
- SynAI/tests/capability/agent-runtime-approval.test.ts
- SynAI/tests/capability/approval-gate.test.js
