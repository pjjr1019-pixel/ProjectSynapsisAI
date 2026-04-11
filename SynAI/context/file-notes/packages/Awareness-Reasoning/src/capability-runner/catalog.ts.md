<!-- source-hash:174a2054b6731c33516f565b7b4b2523199d8aa04ded6c7762f964f205e6e381; note-hash:edbe9ef77af763c96eac4266c3e6961e8eb3b88eeb96b4e6f392a3f2bdbe2bf3 -->
# SynAI/packages/Awareness-Reasoning/src/capability-runner/catalog.ts

## Path
SynAI/packages/Awareness-Reasoning/src/capability-runner/catalog.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../contracts/capability-runner
- ./report
- node:fs/promises
- node:path

## Main Exports
- buildCapabilityRunnerCatalogSummary
- buildCapabilityRunnerCatalogSummary
- CapabilityPromptVariantConfig
- CapabilityRunnerCatalogBundle
- CapabilityRunnerCatalogPaths
- expandCapabilityCatalogs
- expandCapabilityCatalogs
- loadCapabilityRunnerCatalogBundle

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Awareness-Reasoning/src/capability-runner/report.ts
- SynAI/packages/Awareness-Reasoning/src/contracts/capability-runner.ts

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
