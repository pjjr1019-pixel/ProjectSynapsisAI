# Governance Execution Usage

This repo now routes normal chat into governed task execution when the prompt is task-like.
Use the commands below to run and inspect the governance / execution loop directly.

## Quickstart

### Run one governance-exec card

```bash
npm run capability:run -- --card-id governance-exec.close-chrome-safe
```

### Run the full enabled suite

```bash
npm run capability:run:all
```

### Rerun failed cards

```bash
npm run capability:rerun-failed
```

### Mine local chat history into backlog and candidate cards

```bash
npm run capability:mine-history -- --json
```

### Generate remediation proposals

```bash
npm run capability:propose -- --card-id governance-exec.delete-folder-approval
```

### Run sandbox autofix

```bash
npm run capability:sandbox
```

### Inspect artifacts

```bash
Get-Content .runtime/capability-eval/latest-summary.json
Get-Content .runtime/governance-history/candidate-cards.json
```

## VS Code

- Use the `Capability` test explorer to run individual cards.
- Use the `Governance: Mine History` task from `.vscode/tasks.json` to generate backlog and card drafts.
- Open `.runtime/capability-eval/latest-summary.json` after a run to inspect pass/fail details and artifact folders.

## Adding New Capability

### Add a new governed card

1. Create a JSON file under `capability/cards/governance-exec/`.
2. Set `schema_version` to `governance-execution-eval-card.v1`.
3. Fill in the governance fields:
   - `action_intent`
   - `expected_governance_decision`
   - `expected_risk_tier`
   - `expected_executor`
   - `expected_preflight`
   - `expected_verification`
   - `expected_outcome`
4. Choose a verifier type that matches the behavior you want to check.

### Add a new executor

1. Extend `apps/desktop/electron/desktop-actions.ts` for atomic desktop operations.
2. Extend `apps/desktop/electron/workflow-planner.ts` and `workflow-orchestrator.ts` for multi-step tasks.
3. Add or update a governed-chat routing rule in `packages/Governance and exicution/src/governed-chat/router.ts`.
4. Add tests for routing, execution, and verification.

### Add a new policy rule

1. Update `packages/Governance and exicution/src/policy/engine.ts`.
2. Confirm the new risk decision in a router or service test.
3. Add or adjust a governance-exec card so the policy rule stays covered.

### Replay history-derived failures

1. Run `npm run capability:mine-history -- --json`.
2. Inspect `.runtime/governance-history/candidate-cards.json`.
3. Promote useful drafts into `capability/cards/governance-exec/`.
4. Add or update tests for the recovered intent.

