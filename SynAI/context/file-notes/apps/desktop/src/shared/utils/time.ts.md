<!-- source-hash:f199f1294159475f75769ffe4fcecb3251f9d4d93d58710442294a38439fa57e; note-hash:221ea1e4a03a718586cf5b5298c6a77d4943d173955015b0c69aed5af2ce9453 -->
# SynAI/apps/desktop/src/shared/utils/time.ts

## Path
SynAI/apps/desktop/src/shared/utils/time.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- none

## Main Exports
- formatDateTime
- formatDateTime
- formatStopwatch
- formatStopwatch
- formatTime
- formatTime

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.test.ts
- SynAI/apps/desktop/src/shared/utils/time.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts

## Edit Risk
medium

## Edit Guidance
Keep renderer changes narrow and avoid changing governed semantics in UI-only code.

## Likely Tests Affected
- SynAI/apps/desktop/electron/prompting/runtime-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
