<!-- source-hash:b95a797e2429cff5ca97b591dd647bd25dd242fccf0a42dd6c9a47aeeacd6c7d; note-hash:36209b17763c301ea089b33fa6245059a8a66d56ea9dd21379cbc844ab2c18cb -->
# SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts

## Path
SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts

## Area
primary-synai

## Role
support

## Purpose
Shared awareness, memory, retrieval, or local-AI module.

## Main Imports
- ../types
- node:fs/promises
- node:path

## Main Exports
- configureDatabasePath
- configureDatabasePath
- getDatabasePath
- getDatabasePath
- loadDatabase
- loadDatabase
- mutateDatabase
- mutateDatabase

## Likely Side Effects
filesystem or process side effects

## State Touched
memory and context state

## Related Files
- SynAI/packages/Awareness-Reasoning/src/memory/storage/db.js
- SynAI/packages/Awareness-Reasoning/src/memory/types.ts

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
