# Governance-Execution Package Guide

Read this before editing policy, approvals, command hashing, or governed execution code.

## What This Package Owns

- Policy evaluation and risk classification.
- Approval token issuance and validation.
- Governed command hashing and command bus behavior.
- Windows action catalogs and governed execution helpers.
- Governed chat routing, verification, remediation, and audit query plumbing.

## What Is Safe To Extend

- Pure helpers that preserve the current contracts.
- New governed action catalog entries with tests.
- Policy rules with matching behavior coverage.
- Approval and audit plumbing that keeps hash binding intact.

## What Must Stay Governed

- Approval tokens must stay bound to the exact normalized command hash.
- Destructive or system-changing actions must remain preview-first and audit-logged.
- Relative file-operation roots must not widen approval scope.
- Denied decisions must stay distinct from blocked decisions.
- Rollback and compensation paths must remain explicit and tested.

## Extension Rule

If you need a new governed path, add it here first and update the Electron orchestration tests in the same change.
