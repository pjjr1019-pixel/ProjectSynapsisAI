# Capability Eval + Governance Implementation Map

## Current Architecture Discovered

### Desktop App Entrypoints
- Main process: `apps/desktop/electron/main.ts`
- Preload bridge: `apps/desktop/electron/preload.ts`
- Renderer: `apps/desktop/src/main.tsx`

### Local AI Request/Response Path
- Provider plumbing: `packages/Awareness-Reasoning/src/local-ai/*`
- Main-process chat flow and prompt evaluation: `apps/desktop/electron/main.ts`
- Capability harness adapter: `packages/Awareness-Reasoning/src/capability-eval/adapter.ts`

### Orchestration / Workflow Runner
- Awareness bootstrap/runtime: `packages/Awareness-Reasoning/src/bootstrap/index.ts`
- Reasoning / intent routing: `packages/Awareness-Reasoning/src/reasoning/index.ts`
- Capability runner loop: `packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner.ts`

### Governance / Approval / Execution
- Newly centralized package (exact folder name requested):
  - `packages/Governance and exicution/src/`
- Command bus, policy, tokens, execution service, and sandbox/promotion now live there.

### Memory / Retrieval / Context Assembly
- Memory context system: `packages/Awareness-Reasoning/src/memory/*`
- Workspace retrieval index: `packages/Awareness-Reasoning/src/retrieval/workspace-index.ts`
- Capability context resolver: `packages/Awareness-Reasoning/src/capability-eval/context.ts`

### Test Infrastructure
- Vitest test runner from root `package.json`
- Capability/unit/e2e tests in:
  - `tests/capability/*`
  - `tests/e2e/*`
  - `packages/Awareness-Reasoning/tests/*`

### VS Code Integration
- Existing task integration: `.vscode/tasks.json`
- Added minimal Testing API extension wrapper:
  - `apps/vscode-capability-testing/*`

## Files/Modules Extended

### New Governance + Execution Package
- `packages/Governance and exicution/src/contracts.ts`
- `packages/Governance and exicution/src/approvals/ledger.ts`
- `packages/Governance and exicution/src/policy/engine.ts`
- `packages/Governance and exicution/src/commands/hash.ts`
- `packages/Governance and exicution/src/commands/bus.ts`
- `packages/Governance and exicution/src/execution/chat-execution-service.ts`
- `packages/Governance and exicution/src/execution/windows-actions.ts`
- `packages/Governance and exicution/src/remediation/sandbox.ts`
- `packages/Governance and exicution/src/index.ts`

### Alias Wiring
- `tsconfig.json`
- `vite.config.ts`
- `electron.vite.config.ts`
- Added alias: `@governance-execution`

### Capability Harness Refactor
- `packages/Awareness-Reasoning/src/capability-eval/approval/gate.ts` (compat wrapper to governance package)
- `packages/Awareness-Reasoning/src/capability-eval/actions/windows-action-layer.ts` (compat wrapper to governance package)
- `packages/Awareness-Reasoning/src/capability-eval/adapter.ts`
- `packages/Awareness-Reasoning/src/capability-eval/context.ts`
- `packages/Awareness-Reasoning/src/capability-eval/remediation/planner.ts`
- `packages/Awareness-Reasoning/src/capability-eval/verifiers/index.ts`
- `packages/Awareness-Reasoning/src/capability-eval/classifiers/gap-classifier.ts`
- `packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner.ts`
- `packages/Awareness-Reasoning/src/capability-eval/cli/index.ts`
- `packages/Awareness-Reasoning/src/capability-eval/types.ts`

### Capability Data + Schema
- `packages/Capability-Catalog/schemas/capability-test-card.v1.schema.json`
- `packages/Capability-Catalog/cards/windows/safely-close-chrome.json`
- `packages/Capability-Catalog/retrieval/index-hints.json` (new deterministic retrieval metadata hints file)

### Desktop Execution Extraction
- `apps/desktop/electron/main.ts`
  - `provider.chat` / `provider.chatStream` calls routed through `createChatExecutionService(...)`
- `apps/desktop/electron/desktop-actions.ts`
  - governed desktop action service used by the main process
- `apps/desktop/src/features/local-chat/components/DesktopActionsCard.tsx`
  - renderer-facing actions/approvals surface in the Tools tab

### VS Code Wrapper
- `.vscode/tasks.json`
- `apps/vscode-capability-testing/package.json`
- `apps/vscode-capability-testing/tsconfig.json`
- `apps/vscode-capability-testing/src/core.ts`
- `apps/vscode-capability-testing/src/extension.ts`

### Scripts and Package Commands
- `package.json` scripts updated (`capability:issue-token`)

## Naming Decisions

- On-disk folder name preserved exactly: `packages/Governance and exicution`
- Stable import alias: `@governance-execution`
- Token model: signed `ApprovalToken` bound to `commandHash`
- Governance execution transport: deterministic command bus APIs:
  - `enqueueGovernanceCommand`
  - `processNextGovernanceCommand`
  - `getGovernanceCommandStatus`

## Conflicts / Risks

- Full repo test run currently has unrelated pre-existing failures outside this implementation scope:
  - unresolved `@awareness/reasoning/resource-usage` import in some desktop/smoke tests
  - existing `selection is not defined` in awareness-engine tests
- Governed promotion now requires signed token; old plain approver-only promotion behavior is intentionally removed for risky promotion.
- VS Code extension wrapper is intentionally minimal (Testing API run/rerun/artifact open), not a full UX product.

## Final Implementation Plan Followed

1. Created `packages/Governance and exicution` and implemented contracts, policy engine, token ledger, command bus, shared chat execution service, and governed sandbox/promotion flow.
2. Added `@governance-execution` alias wiring in TypeScript + Vite + Electron configs.
3. Refactored capability harness to consume governance package APIs via compatibility wrappers (no direct governance logic retained inside capability-eval modules).
4. Extracted shared local chat execution orchestration into `createChatExecutionService(...)` and used it from both desktop chat flow and capability adapter.
5. Expanded auto-remediation routing to include deterministic retrieval metadata/index hints (`retrieval-hint-merge`) with governance checks.
6. Added richer deterministic action verifiers:
   - action sequence
   - action preconditions
   - action risk class
   - action approval-token assertions
7. Replaced plain governed promotion checks with signed approval token validation bound to command hash.
8. Added minimal VS Code Testing API extension wrapper + helper core for card discovery, run/rerun, and artifact path resolution.
9. Added unit + integration + smoke tests for governance, command bus, tokens, remediations, verifiers, and extension helper logic.
