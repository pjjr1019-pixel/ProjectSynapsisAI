<!-- source-hash:7b6ea0309779f7ae9d46284325a88a0392ac3605490d0fdc24ea818d6170ddd3; note-hash:9714ea52ae81d8f21012b71f5982a5dade148412911bb596f2d913a2e47d1913 -->
# SynAI/scripts/operator.ts

## Path
SynAI/scripts/operator.ts

## Area
primary-synai

## Role
support

## Purpose
Project support or operator script.

## Main Imports
- @awareness
- @awareness
- @governance-execution
- @governance-execution/execution/windows-action-catalog
- node:fs/promises
- node:path
- node:url

## Main Exports
- runOperatorCli
- runOperatorCli

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/scripts/operator.js
- SynAI/tests/capability/operator-cli.test.js
- SynAI/tests/capability/operator-cli.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/tests/capability/operator-cli.test.js
- SynAI/tests/capability/operator-cli.test.ts
