# Workflow Runtime

## Live Route Wiring

Current live route order in `server/http-routes.mjs`:

1. `POST /api/task-manager/chat` or `POST /api/chat`
2. `tryBuildRuntimeReply(...)` answers direct task-manager telemetry and local-provider status questions first
3. `maybeHandleWorkflowChatRequest(...)` handles actionable requests through workflow reuse or workflow planning
4. governed execution still runs through the existing approval, rollback, and safety rails
5. if the workflow runtime returns `null`, the route falls back to `buildChatReply(...)`

`POST /api/task-manager/actions/execute` still exposes direct `executeGovernedPlanDirect(...)` for API callers. It remains live, but it is not the default chat entry path.

`POST /api/task-manager/actions/approve` still executes the approved governed plan through `approveGovernedApproval(...)`. When the approval originated from the workflow runtime, the route now finalizes that run through `finalizeApprovedWorkflowExecution(...)` and returns the workflow verification metadata alongside the approval result.

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

Legacy deterministic planning code still lives in `portable_lib/governed-actions.mjs`, but the live chat route does not call `tryHandleGovernedChatRequest(...)` first anymore.

The legacy governed planner only runs through the fallback path inside `portable_lib/workflow-execution-service.mjs`, and only when `ENABLE_LEGACY_GOVERNED_CHAT_PLANNER=true`.

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
