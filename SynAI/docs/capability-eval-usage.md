# Capability Eval Usage

## Purpose

Capability eval is a deterministic harness that verifies whether SynAI can complete real tasks, classifies failed results into explicit gap types, proposes remediation, and supports approval-gated sandbox/promotion loops.

## Architecture Summary

- Test cards: `packages/Capability-Catalog/cards/**/*.json`
- Card schema: `packages/Capability-Catalog/schemas/capability-test-card.v1.schema.json`
- Retrieval hints: `packages/Capability-Catalog/retrieval/index-hints.json`
- Core eval engine: `packages/Awareness-Reasoning/src/capability-eval/`
- Governance + execution package: `packages/Governance-Execution/src/`
- Desktop action catalog and governed runtime: `apps/desktop/electron/desktop-actions.ts`
- Renderer desktop actions surface: `apps/desktop/src/features/local-chat/components/DesktopActionsCard.tsx`
- Artifacts/history output: `.runtime/capability-eval/`
- VS Code tasks: `.vscode/tasks.json`
- VS Code Testing API wrapper: `apps/vscode-capability-testing/`

Read [packages/Governance-Execution/README.md](../packages/Governance-Execution/README.md) and [AGENT_INSERTION_POINTS.md](AGENT_INSERTION_POINTS.md) before changing eval-driven governance code.

## Operator Quickstart

From repo root (`SynAI`):

1. Run one card:
`npm run capability:run -- --card-id windows.highest-ram-process`

2. Run all enabled cards:
`npm run capability:run:all`

3. Inspect artifacts:
`type .runtime\\capability-eval\\latest-summary.json`

4. Generate remediation proposals only:
`npm run capability:propose -- --card-id windows.identify-slowing-pc`

5. Run sandbox apply mode:
`npm run capability:run -- --card-id windows.identify-slowing-pc --mode sandbox-apply --auto-remediate`

6. Use action cards for deterministic desktop-governance coverage:
- launch/open actions
- file and folder create/move/delete actions
- settings/control-panel navigation
- approval-gated process termination

6. Rerun failed cards:
`npm run capability:rerun-failed`

## Governed Promotion With Signed Token

1. Compute command hash for the card promotion target:
`npm run capability:promotion-hash -- --card-id windows.identify-slowing-pc --target-path packages/Capability-Catalog/cards/windows/identify-slowing-pc.json`

2. Issue signed token:
`npm run capability:issue-token -- --command-hash <sha256-from-step-1> --approved-by "qa-operator" --json`

3. Run governed promotion with token:
`npm run capability:run -- --card-id windows.identify-slowing-pc --mode governed-promotion --auto-remediate --approved-by "qa-operator" --approval-token '<token-json>'`

Notes:
- `--approved-by` is retained for attribution.
- destructive/high-risk promotion requires a valid signed `--approval-token`.

## CLI Modes

1. `proposal-only` (default)
- executes + verifies + classifies + proposes remediation
- does not apply patches

2. `sandbox-apply`
- applies eligible auto patches in isolated sandbox path
- reruns verifier after sandbox patch
- does not promote to workspace automatically

3. `governed-promotion`
- sandbox apply + rerun checks
- promotion command is policy-gated and token-validated
- writes approval/governance audit artifacts

## CLI Flags

- `--json`: machine-readable summary output (for extension/automation)
- `--approval-token`: signed approval token payload (raw JSON or `base64:<payload>`)
- `--approved-by`: approver attribution
- `--auto-remediate`: allow governed auto patch paths when eligible
- `--dry-run`: execute + verify only

## Artifact Layout

- `.runtime/capability-eval/latest-summary.json`
- `.runtime/capability-eval/history.jsonl`
- `.runtime/capability-eval/runs/<run-id>/summary.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/test-card.snapshot.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/model-request.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/model-response.raw.txt`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/model-response.structured.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/verifier-result.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/gap-classification.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/remediation-plan.json`
- `.runtime/capability-eval/runs/<run-id>/<card-id>/sandbox-result.json`
- `.runtime/capability-eval/approvals/*.json`
- `.runtime/capability-eval/governance/*.commands.jsonl`

## Adding New Capability Cards

1. Copy an existing card under `packages/Capability-Catalog/cards/`.
2. Set unique `id`, deterministic prompt, and strict verifier config.
3. Declare tool boundaries (`allowed_tools`, `forbidden_tools`) and context.
4. Set `approval_required=true` for risky/destructive scenarios.
5. Run:
`npm run capability:run -- --card-id <new-card-id>`

## Determinism and Safety Rules

- Model confidence is never treated as capability proof.
- Capability is present only when verifier passes.
- Gap classification is deterministic-first logic.
- Auto-remediation is constrained and audited.
- Risky/destructive promotion requires explicit signed approval token.
