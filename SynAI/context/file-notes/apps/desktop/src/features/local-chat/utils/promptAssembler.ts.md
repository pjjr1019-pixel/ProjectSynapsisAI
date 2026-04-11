<!-- source-hash:dfaec50c2cce10e6098ce2a8aa0479a5da62582b3fe6b5d5f2f508d37fc9fd8e; note-hash:dcc8fde1b56a22787bdc122f4294892babbdeb09a23bce274055601a60357630 -->
# SynAI/apps/desktop/src/features/local-chat/utils/promptAssembler.ts

## Path
SynAI/apps/desktop/src/features/local-chat/utils/promptAssembler.ts

## Area
primary-synai

## Role
support

## Purpose
Renderer-side desktop UI module.

## Main Imports
- @contracts

## Main Exports
- summarizePromptContext
- summarizePromptContext

## Likely Side Effects
unknown

## State Touched
local chat UI state

## Related Files
- SynAI/apps/desktop/src/features/local-chat/utils/promptAssembler.js

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
