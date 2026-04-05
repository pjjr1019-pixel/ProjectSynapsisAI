# Prompt Eval Harness

## What It Does

The prompt eval harness runs prompt cases against the app's real internal decision chain without spinning up the UI:

1. task-manager runtime shortcut
2. workflow runtime
3. governed execution, approval, verification, and capture
4. fallback chat

It evaluates structured payload behavior first, reply text second, stores raw results, and writes a Markdown + JSON report under `brain/runtime/evals/`.

## Where Cases Live

Prompt case files live in `tests/evals/prompt-cases/`.

Each case uses JSON and can include:

- `id`
- `prompt`
- `mode`: `route`, `workflow`, or `governed_direct`
- `setup`
- `cleanup`
- `tags`
- `repeat`
- `allowVariants`
- `approval`
- `expect`

The `expect` block supports:

- `source_equals`
- `source_in`
- `forbid_source`
- `status_equals`
- `status_in`
- `verified`
- `verification_strength`
- `approval_required`
- `workflow_required`
- `workflow_reuse`
- `reply_contains_any`
- `reply_contains_all`
- `reply_not_contains`
- `payload_paths_present`
- `payload_paths_absent`
- `custom_notes`

## Sandboxing

The harness never writes to the real user Desktop or Documents.

It creates an eval-only sandbox under `brain/runtime/evals/sandbox/` with:

- `app/taskmanager-root/` for app runtime data, workflow specs, logs, and generated artifacts
- `Desktop/` for sandboxed desktop-targeted prompts
- `Documents/` for sandboxed document-targeted prompts

The runner overrides:

- `HORIZONS_TASKMANAGER_ROOT`
- `HORIZONS_BRAIN_ROOT`
- `HORIZONS_RUNTIME_STATE_ROOT`
- `HORIZONS_GENERATED_RUNTIME_ROOT`
- `HORIZONS_WORKFLOW_RUNTIME_ROOT`
- `HORIZONS_WORKFLOW_RUNTIME_BASE_ROOT`
- `HORIZONS_GOVERNED_RUNTIME_ROOT`
- `HORIZONS_DESKTOP_PATH`
- `HORIZONS_DOCUMENTS_PATH`

It also disables learned-QA writes and local LLM use for deterministic eval runs.

## How To Run

Run the full base suite:

```bash
npm run test:evals
```

Run the reusable workflow loop suite:

```bash
npm run test:evals:loop
```

Rebuild the latest Markdown report from the most recent JSON results:

```bash
npm run test:evals:report
```

Run a single case:

```bash
node tests/evals/run-prompt-evals.mjs --case workflow.route.create-folder
```

Run by tag:

```bash
node tests/evals/run-prompt-evals.mjs --tag approval
```

Run with variants:

```bash
node tests/evals/run-prompt-evals.mjs --tag variant --variants
```

Force dry-run by default:

```bash
node tests/evals/run-prompt-evals.mjs --dry-run-default
```

## Reports

The runner writes:

- `brain/runtime/evals/results/latest-results.json`
- `brain/runtime/evals/results/latest-report.md`
- `brain/runtime/evals/results/failures.jsonl`
- `brain/runtime/evals/history/<timestamp>.json`

The Markdown report includes:

- overall summary
- subsystem breakdown
- failure counts by category
- top recurring failing prompts
- workflow findings
- repair recommendations tied to actual failure clusters

## Failure Categories

Current failure labels include:

- `wrong_source`
- `wrong_status`
- `missing_workflow_id`
- `unexpected_approval`
- `missing_approval`
- `missing_verification`
- `wrong_verification_strength`
- `reply_mismatch`
- `forbidden_reply_text`
- `runtime_error`
- `duplicate_workflow_behavior`
- `fallback_misroute`
- `route_not_handled`
- `malformed_payload`
- `workflow_not_reused`
- `workflow_not_promoted`
- `flaky_behavior`
