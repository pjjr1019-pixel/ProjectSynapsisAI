<!-- source-hash:268b6889c2d56a413d7cf61cbcb7398622183f543255147862b8f0121f9fac54; note-hash:cc0c1bfd9ea41549481a0db5138054a94acb1cf62d690786190b75d39b150433 -->
# SynAI/packages/Awareness-Reasoning/src/machine/index.ts

## Path
SynAI/packages/Awareness-Reasoning/src/machine/index.ts

## Area
primary-synai

## Role
canonical

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../context
- ../contracts/awareness
- ./maps
- ./windows

## Main Exports
- buildControlPanelMap
- buildRegistryZoneMap
- buildSettingsMap
- createWindowsMachineInventorySource
- searchControlPanelEntries
- searchRegistryZoneEntries
- searchSettingsMapEntries
- toControlPanelSummary

## Likely Side Effects
unknown

## State Touched
awareness snapshots and retrieval state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/contracts/awareness.ts
- SynAI/packages/Awareness-Reasoning/src/machine/index.js
- SynAI/packages/Awareness-Reasoning/src/machine/maps.ts
- SynAI/packages/Awareness-Reasoning/src/machine/windows.ts
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.js
- SynAI/packages/Awareness-Reasoning/tests/workspace-index.test.ts

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
