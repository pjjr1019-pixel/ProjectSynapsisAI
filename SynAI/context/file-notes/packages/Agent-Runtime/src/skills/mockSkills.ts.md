<!-- source-hash:418071dbecadea761aeb3ae278f9439c25ad87c6a05672b994a583ccd7d4ef22; note-hash:c781b647aac5a7bb2b08543dc6f343a9d69ae4e2e9dc1ca085628d1cdd7afc8e -->
# SynAI/packages/Agent-Runtime/src/skills/mockSkills.ts

## Path
SynAI/packages/Agent-Runtime/src/skills/mockSkills.ts

## Area
primary-synai

## Role
support

## Purpose
Canonical agent runtime implementation module.

## Main Imports
- ../contracts
- ./SkillRegistry
- ./types

## Main Exports
- createDefaultSkillRegistry
- createDefaultSkillRegistry
- echoTextSkill
- echoTextSkill
- mockOpenAppSkill
- mockOpenAppSkill

## Likely Side Effects
unknown

## State Touched
unknown

## Related Files
- SynAI/packages/Agent-Runtime/src/contracts/index.ts
- SynAI/packages/Agent-Runtime/src/skills/SkillRegistry.ts
- SynAI/packages/Agent-Runtime/src/skills/mockSkills.js
- SynAI/packages/Agent-Runtime/src/skills/types.ts
- SynAI/packages/Agent-Runtime/tests/skills/mockSkills.test.js
- SynAI/packages/Agent-Runtime/tests/skills/mockSkills.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.js
- SynAI/packages/Agent-Runtime/tests/audit/audit.test.ts
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.js
- SynAI/packages/Agent-Runtime/tests/audit/file-audit-store.test.ts
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.js
- SynAI/packages/Agent-Runtime/tests/evals/evals.test.ts
- SynAI/packages/Agent-Runtime/tests/planner/prompt-intent-bridge.test.ts
- SynAI/packages/Agent-Runtime/tests/policy/approval-validation.test.js
