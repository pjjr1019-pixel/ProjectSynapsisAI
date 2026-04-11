<!-- source-hash:9b8a68d166e5cb662f57c46ea0f346159a69c0059ec3abce2107c614159c08c0; note-hash:cdcfe412e3a83617d5e26eb8ce50301d45b5a1e1efab52f18637f28100671812 -->
# SynAI/packages/Awareness-Reasoning/src/contracts/grounding.ts

## Path
SynAI/packages/Awareness-Reasoning/src/contracts/grounding.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ./awareness
- ./chat

## Main Exports
- GROUNDING_CLAIM_STATUSES
- GROUNDING_CLAIM_STATUSES
- GROUNDING_SOURCE_KINDS
- GROUNDING_SOURCE_KINDS
- GroundingClaim
- GroundingClaimStatus
- GroundingConflict
- GroundingMetadata

## Likely Side Effects
unknown

## State Touched
agent runtime state and contracts

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/grounding.js
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.js
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.ts
- SynAI/packages/Awareness-Reasoning/tests/grounding.test.js
- SynAI/packages/Awareness-Reasoning/tests/grounding.test.ts

## Edit Risk
high

## Edit Guidance
Treat as shared contract surface; update the smallest affected tests alongside any field or enum change.

## Likely Tests Affected
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.js
