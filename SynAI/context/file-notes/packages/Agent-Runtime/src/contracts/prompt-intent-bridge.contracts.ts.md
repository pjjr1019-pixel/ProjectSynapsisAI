<!-- source-hash:6836fe00bc533dbc579bff73433b72991d53cc9cc4cab7b56e6e8fd9ad3a818a; note-hash:4423333d2e0069c28c3b605775004362c56acc10788ba9c5c03d18cc2f64a643 -->
# SynAI/packages/Agent-Runtime/src/contracts/prompt-intent-bridge.contracts.ts

## Path
SynAI/packages/Agent-Runtime/src/contracts/prompt-intent-bridge.contracts.ts

## Area
primary-synai

## Role
canonical

## Purpose
Canonical runtime contract surface.

## Main Imports
- zod

## Main Exports
- AgentTaskPromptIntentBridgeMetadata
- AgentTaskPromptIntentBridgeMetadataSchema
- AgentTaskPromptIntentBridgeMetadataSchema
- PROMPT_INTENT_BRIDGE_METADATA_KEY
- PROMPT_INTENT_BRIDGE_METADATA_KEY
- PromptIntentBridgeAmbiguityFlag
- PromptIntentBridgeAmbiguityFlagSchema
- PromptIntentBridgeAmbiguityFlagSchema

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- none identified

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
