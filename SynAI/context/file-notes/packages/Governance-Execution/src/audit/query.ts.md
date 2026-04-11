<!-- source-hash:02f72733a3813e7300b2936f38293d8cd3794fc37aa82fb8716f38f8e8224e1e; note-hash:8927b28b3e603a188d862c052ce6ebf4bd2512d5f02f98c59c045c510459e8c1 -->
# SynAI/packages/Governance-Execution/src/audit/query.ts

## Path
SynAI/packages/Governance-Execution/src/audit/query.ts

## Area
primary-synai

## Role
support

## Purpose
Governed execution policy/orchestration module.

## Main Imports
- @contracts
- node:fs/promises
- node:path

## Main Exports
- GovernanceAuditQueryOptions
- queryGovernanceAuditEntries
- queryGovernanceAuditEntries

## Likely Side Effects
filesystem or process side effects

## State Touched
unknown

## Related Files
- SynAI/packages/Governance-Execution/src/audit/query.js
- SynAI/tests/capability/governance-audit-query.test.js
- SynAI/tests/capability/governance-audit-query.test.ts

## Edit Risk
medium

## Edit Guidance
Keep edits local and verify adjacent tests before widening scope.

## Likely Tests Affected
- SynAI/tests/capability/governance-audit-query.test.js
- SynAI/tests/capability/governance-audit-query.test.ts
