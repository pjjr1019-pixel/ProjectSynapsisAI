<!-- source-hash:d80c46d0173100e9f88ce9fae43dfa40c4a5171a90ebd9dee7989fc44a963ac0; note-hash:fb73f50586e8ae537f4b8f20f61e42eba05850a450456ce4b4d66d4c7922b049 -->
# SynAI/packages/Awareness-Reasoning/src/governance-history/miner.ts

## Path
SynAI/packages/Awareness-Reasoning/src/governance-history/miner.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/chat
- ../memory
- ../target-knowledge
- @governance-execution/governed-chat/types
- node:fs/promises
- node:path

## Main Exports
- GovernedHistoryMiningOptions
- GovernedHistoryMiningResult
- mineGovernedHistory
- mineGovernedHistory

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/chat.ts
- SynAI/packages/Awareness-Reasoning/src/governance-history/miner.js
- SynAI/packages/Awareness-Reasoning/src/memory/index.ts
- SynAI/packages/Awareness-Reasoning/src/target-knowledge.ts
- SynAI/tests/capability/governance-history-miner.test.js
- SynAI/tests/capability/governance-history-miner.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.js
- SynAI/packages/Awareness-Reasoning/tests/awareness-engine.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-awareness.test.ts
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.js
- SynAI/packages/Awareness-Reasoning/tests/file-journal.test.ts
- SynAI/packages/Awareness-Reasoning/tests/fixtures/grounding-eval-fixtures.json
- SynAI/packages/Awareness-Reasoning/tests/grounding-eval.test.js
