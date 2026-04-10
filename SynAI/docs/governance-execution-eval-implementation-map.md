# Governance Execution Eval Implementation Map

## Current Architecture Discovered

### Normal Chat Entry Point
- `apps/desktop/electron/main.ts`
- `apps/desktop/electron/preload.ts`
- `apps/desktop/src/features/local-chat/hooks/useLocalChat.ts`
- `apps/desktop/src/features/local-chat/components/MessageList.tsx`
- `apps/desktop/src/features/local-chat/components/MessageItem.tsx`

### Existing Chat and Reasoning Contracts
- `packages/Awareness-Reasoning/src/contracts/chat.ts`
- `packages/Awareness-Reasoning/src/contracts/ipc.ts`
- `packages/Awareness-Reasoning/src/contracts/memory.ts`
- `packages/Awareness-Reasoning/src/memory/index.ts`

### Existing Governance and Execution Layer
- `packages/Governance and exicution/src/contracts.ts`
- `packages/Governance and exicution/src/policy/engine.ts`
- `packages/Governance and exicution/src/commands/bus.ts`
- `packages/Governance and exicution/src/commands/hash.ts`
- `packages/Governance and exicution/src/approvals/ledger.ts`
- `packages/Governance and exicution/src/execution/chat-execution-service.ts`
- `packages/Governance and exicution/src/execution/windows-actions.ts`
- `packages/Governance and exicution/src/execution/windows-action-catalog.ts`
- `packages/Governance and exicution/src/remediation/sandbox.ts`

### Existing Desktop Executors and Workflow Orchestration
- `apps/desktop/electron/desktop-actions.ts`
- `apps/desktop/electron/workflow-planner.ts`
- `apps/desktop/electron/workflow-orchestrator.ts`
- `apps/desktop/electron/browser-session.ts`

### Existing Capability Eval / Regression Infrastructure
- `packages/Awareness-Reasoning/src/capability-eval/*`
- `packages/Capability-Catalog/cards/windows/*.json`
- `packages/Capability-Catalog/retrieval/index-hints.json`
- `scripts/capability-eval.ts`
- `tests/capability/*`
- `tests/e2e/*`
- `.vscode/tasks.json`
- `apps/vscode-capability-testing/*`

### Existing Audit / Artifact Locations
- `.runtime/governance/`
- `.runtime/capability-eval/`
- `.runtime/prompt-eval/`
- `.runtime/awareness/`

## What Already Exists

- A working local chat pipeline with memory, RAG, grounding, and stream updates.
- A governance command bus, approval ledger, and policy engine for low-level command execution.
- A typed desktop action catalog with approval-gated file, app, and process operations.
- A typed workflow planner and orchestrator for multi-step Windows tasks.
- A capability-eval harness with deterministic verifiers, a remediation loop, and CLI entrypoints.
- A VS Code Testing API extension wrapper for running capability cards from the editor.

## What Must Be Added Or Extended

### 1. Chat-to-Governance Router
- Add a deterministic router in front of normal chat synthesis.
- Detect whether the user message is:
  - answer-only
  - executable desktop action
  - multi-step workflow
  - approval replay / confirmation
  - clarification-needed
  - denied / blocked
  - plan-only
- Preserve the existing answer path when the message is not task-like.

### 2. Rich Governance Decision Contract
- Add a typed decision record that carries:
  - request id
  - interpreted intent
  - action type
  - risk tier
  - approval state
  - executor recommendation
  - verification requirement
  - policy rules triggered
  - reasoning summary
  - artifact metadata

### 3. Execution Dispatch and Verification
- Reuse `desktop-actions.ts` and `workflow-orchestrator.ts` as the real executors.
- Add a post-execution verifier layer for:
  - result text
  - JSON fields
  - file state
  - process state
  - app state
  - approval / refusal state
- Keep unsupported capabilities honestly stubbed behind interfaces.

### 4. Gap Classification and Remediation
- Add a deterministic failure classifier for:
  - missing intent rule
  - ambiguous intent
  - missing governance rule
  - incorrect governance decision
  - missing executor
  - incorrect executor selection
  - missing preflight
  - missing verifier
  - verification failure
  - runtime execution failure
  - missing rollback
  - missing knowledge / retrieval
  - missing workflow wrapper
  - approval state issue
  - missing history replay rule
  - test-card defect
- Map each gap to a safe remediation plan with concrete file targets and follow-up tests.

### 5. History Mining
- Read only local persisted data:
  - conversations
  - message history
  - summaries
  - eval artifacts
  - failure logs
- Mine repeated failed task attempts into:
  - backlog items
  - regression candidates
  - history-derived eval cards
  - remediation proposals

### 6. Eval Cards and CLI
- Extend the existing card schema with governance-execution specific fields.
- Add starter cards for:
  - read-only inspection
  - safe reversible actions
  - approval-gated actions
  - refusal tests
  - ambiguous intent tests
  - missing executor tests
  - missing policy tests
  - verification tests
  - rollback tests
- Add CLI commands for:
  - run one card
  - run all cards
  - rerun failed
  - mine history
  - generate remediation proposals
  - sandbox autofix

### 7. UI Surface
- Keep the normal chat entrypoint.
- Surface approval-needed task state in chat message metadata and a lightweight badge in the message renderer.
- Preserve the existing Tools tab and Actions/Workflows cards.

## Exact Files And Modules To Extend

### Core Chat Routing
- `apps/desktop/electron/main.ts`
- `packages/Awareness-Reasoning/src/contracts/chat.ts`
- `apps/desktop/src/features/local-chat/components/MessageItem.tsx`
- `apps/desktop/src/features/local-chat/components/ToolsPanel.tsx`

### Governance / Execution Runtime
- `packages/Governance and exicution/src/index.ts`
- `packages/Governance and exicution/src/contracts.ts`
- `packages/Governance and exicution/src/policy/engine.ts`
- `packages/Governance and exicution/src/commands/bus.ts`
- `packages/Governance and exicution/src/execution/windows-actions.ts`
- `packages/Governance and exicution/src/execution/windows-action-catalog.ts`
- `packages/Governance and exicution/src/remediation/sandbox.ts`

### New Governance-Exec Modules
- `packages/Governance and exicution/src/governed-chat/types.ts`
- `packages/Governance and exicution/src/governed-chat/router.ts`
- `packages/Governance and exicution/src/governed-chat/verification.ts`
- `packages/Governance and exicution/src/governed-chat/gap-classifier.ts`
- `packages/Governance and exicution/src/governed-chat/remediation.ts`

### Memory And History Mining
- `packages/Awareness-Reasoning/src/memory/index.ts`
- `packages/Awareness-Reasoning/src/governance-history/*`

### Eval / Regression Harness
- `packages/Awareness-Reasoning/src/capability-eval/types.ts`
- `packages/Awareness-Reasoning/src/capability-eval/schema.ts`
- `packages/Awareness-Reasoning/src/capability-eval/verifiers/index.ts`
- `packages/Awareness-Reasoning/src/capability-eval/classifiers/gap-classifier.ts`
- `packages/Awareness-Reasoning/src/capability-eval/remediation/planner.ts`
- `packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner.ts`
- `packages/Awareness-Reasoning/src/capability-eval/cli/index.ts`
- `packages/Capability-Catalog/cards/governance-exec/*.json`

### CLI, Tasks, And VS Code
- `package.json`
- `scripts/capability-eval.ts`
- `.vscode/tasks.json`
- `apps/vscode-capability-testing/src/core.ts`
- `apps/vscode-capability-testing/src/extension.ts`

## Naming Decisions

- Preserve the existing package folder name `packages/Governance and exicution`.
- Keep the existing `@governance-execution` alias.
- Use `governed-chat` for the normal-chat router surface and `governance-history` for local history mining.
- Keep approval tokens bound to exact normalized commands / workflow hashes.
- Keep execution verbs obvious:
  - `allow`
  - `allow_with_verification`
  - `require_approval`
  - `clarify`
  - `deny`
  - `plan_only`

## Risk Areas

- Over-routing normal questions into task execution.
- Under-routing vague but executable task prompts.
- Approval replay without a fresh explicit user confirmation.
- File deletion, process termination, and uninstall actions becoming too permissive.
- Verification gaps for OS actions that complete but do not actually achieve the requested state.
- History mining accidentally inferring permission from prior conversations.
- New eval cards drifting away from deterministic verifier expectations.

## Implementation Sequence Followed

1. Inspect the current chat, memory, workflow, and governance surfaces.
2. Confirm the existing command bus, approval ledger, desktop actions, and workflow orchestration can be reused.
3. Add the implementation map for traceability.
4. Add a deterministic chat router in front of normal synthesis.
5. Extend chat metadata and the UI message item so approval/task state is visible.
6. Add governance-exec runtime types, verification, gap classification, and remediation helpers.
7. Add history mining over local conversations and task artifacts.
8. Extend the capability-eval schema and starter cards for governance-execution.
9. Add CLI and VS Code task hooks for running, rerunning, mining, and inspecting artifacts.
10. Add tests for routing, verification, mining, remediation, and artifact generation.
