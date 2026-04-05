# Workflow Runtime

## Canonical Flow

Default action handling now runs through this path:

1. `POST /api/task-manager/chat` or `POST /api/chat`
2. task-manager telemetry shortcut only for direct runtime/provider status questions
3. workflow registry lookup for trusted reusable workflows
4. structured workflow planning for new actionable requests
5. deterministic validation of governed action contracts
6. governed execution with existing approvals, path policy, safelists, and rollback
7. verification of the execution outcome
8. workflow capture or workflow stat update
9. workflow run episode persistence

Non-action or knowledge chat still falls back to `portable_lib/brain-chat-reply.mjs`.

## Workflow Spec

Canonical workflow specs are stored as JSON under:

- `brain/runtime/workflows/candidates/`
- `brain/runtime/workflows/trusted/`
- `brain/runtime/workflows/archive/`
- `brain/runtime/workflow-runs/`
- `brain/runtime/workflow-index/`

Each workflow JSON includes:

- `id`
- `schemaVersion`
- `title`
- `status`
- `createdAt`
- `updatedAt`
- `source`
- `intentLabel`
- `examplePrompts`
- `slots`
- `preconditions`
- `steps`
- `verification`
- `rollbackHints`
- `approvalProfile`
- `successCount`
- `failureCount`
- `lastSuccessAt`
- `lastFailureAt`
- `confidence`
- `tags`
- `notes`

## Lifecycle

- New successful verified workflows are captured as `candidate`.
- Existing matching workflows are updated instead of duplicated.
- Candidates promote to `trusted` after repeated verified successes within the configured failure threshold.
- Disabled and archived workflows are excluded from matching.
- Failed executions can update existing workflow failure stats but do not auto-promote.

## Verification

Verification is explicit and step-aware. Current checks cover:

- folder creation
- file write and append
- move, copy, rename, delete
- document summary outputs
- batch summary output folders
- summary report export
- system utility launch as best-effort weak verification

Run payloads distinguish:

- execution success
- `verified`
- `verificationStrength`
- verification notes and failed checks

## Feature Flags

Key runtime flags:

- `ENABLE_MODEL_FIRST_WORKFLOWS=true`
- `ENABLE_WORKFLOW_REUSE=true`
- `ENABLE_WORKFLOW_CAPTURE=true`
- `ENABLE_WORKFLOW_PROMOTION=true`
- `ENABLE_LEGACY_GOVERNED_CHAT_PLANNER=false`

The route can still fall back to the legacy governed chat planner if that legacy flag is explicitly enabled.

## Legacy Status

Legacy deterministic planning code remains in `portable_lib/governed-actions.mjs`.

What changed:

- the live chat route no longer calls `tryHandleGovernedChatRequest(...)` first
- workflow-first orchestration now decides whether to reuse a trusted workflow, plan a structured workflow, or fall back to normal chat

What remains legacy:

- the old governed chat action planner code
- fuzzy planner helpers inside `portable_lib/governed-actions.mjs`
- the old path is still preserved for fallback and comparison, but it is off by default

## Capture and Promotion

Every workflow attempt writes a run episode JSON with:

- request
- workflow id
- source path
- plan
- approval state
- execution result
- verification result
- rollback references
- timings
- compact reflection

Verified successful runs are promoted into the reusable workflow library over time. Unverified or failed runs stay in episode history without becoming trusted reusable workflows.

