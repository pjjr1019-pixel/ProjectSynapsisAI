# SynAI Agent Guide

Read this first before editing agent, runtime, policy, or orchestration code.

SynAI today is a Windows-first local desktop app with a real chat shell, memory and context pipeline, and a governed execution stack. It is not a free-for-all autonomous agent. The current posture is still foundation-first: the repo favors small typed contracts, preview paths, dry-run defaults, and deterministic mock-backed behavior over fake completeness.

## What SynAI Is Right Now

- `SynAI/apps/desktop/` is the Electron app: main process, preload bridge, and React renderer.
- `SynAI/packages/Awareness-Reasoning/src/` owns memory storage, prompt context assembly, local AI, awareness, retrieval, web search, and capability-eval plumbing.
- `SynAI/packages/Governance-Execution/src/` owns governance policy, approvals, command hashing, audit query plumbing, Windows action catalogs, and execution helpers.
- `SynAI/packages/Agent-Runtime/src/` is the canonical agent runtime package for the repo.
- `SynAI/packages/Agent-Runtime/tests/` is the Jest suite for the canonical runtime package.
- `@agent-runtime` is the preferred canonical import alias for the runtime package.
- `@synai-agent` is compatibility-only and should not grow new logic.

## What Already Works And Must Not Break

- The canonical contract set in `SynAI/packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts` defines the core task, step, skill, execution, observation, verification, policy, audit, job, and checkpoint shapes.
- The no-op runtime in `SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.ts` already runs a task through planner, policy, executor, perception, verifier, and audit paths.
- The default skills are intentionally tiny: `echo_text` and `mock_open_app`.
- The Electron main process already exposes `agentRuntimeRun` through IPC, so the runtime surface is part of the app contract.
- Existing chat, memory, context preview, workflow orchestration, and capability-eval flows already depend on these shapes. Changing them without mirror updates will ripple into the app.

## Current App Shape

- `SynAI/packages/Agent-Runtime/src/` is the source of truth for future agent work. Keep new canonical logic there first.
- `@agent-runtime` is the preferred import surface for new code.
- `@synai-agent` exists only as a compatibility surface for SynAI-facing imports and tests. Do not introduce a second implementation behind it.
- `SynAI/apps/desktop/electron/` is the main-process boundary. Keep orchestration, IPC, and side effects there.
- `SynAI/apps/desktop/src/` is renderer-only UI: chat, history, tools, settings, memory, workflow cards, and preview panels.
- `SynAI/packages/Awareness-Reasoning/src/` is shared reasoning and storage code, not UI.
- `SynAI/packages/Governance-Execution/src/` is shared policy and execution code, not renderer code.
- `SynAI/packages/Capability-Catalog/` and `SynAI/tests/capability/` are the behavioral eval harness and its test fixtures, not the production runtime.
- `SynAI/apps/vscode-capability-testing/` is a small editor-facing wrapper around the same capability harness.

## Where Future Agent Code Should Live

Put future agent subsystems under `SynAI/packages/Agent-Runtime/src/<subsystem>/`, with contracts in `SynAI/packages/Agent-Runtime/src/contracts/`. Likely subtrees are `core`, `skills`, `planner`, `executor`, `perception`, `policy`, `runtime`, `verifier`, `audit`, and `evals`.

If the app needs the same surface, adjust the `@synai-agent` alias wiring or add package-local compatibility exports, but do not move the source of truth out of `SynAI/packages/Agent-Runtime/src/`.

## Safe Vs Risky Changes

Safe changes:

- New docs, specs, ADRs, or context packs.
- New pure helpers and new tests.
- New mock skills or adapters that preserve dry-run behavior.
- Backward-compatible contract additions with mirrored tests.

Risky changes:

- Renaming contract fields, status enums, or result shapes.
- Editing `SynAI/apps/desktop/electron/main.ts`, `workflow-orchestrator.ts`, or `workflow-planner.ts` without updating app tests.
- Editing `SynAI/packages/Awareness-Reasoning/src/memory/*` without checking context assembly and smoke tests.
- Editing `SynAI/packages/Governance-Execution/src/policy/engine.ts`, approvals, or Windows action catalogs without behavior tests.
- Adding real Windows automation, process termination, destructive file operations, or network side effects before the policy and audit story is ready.

## Validation Commands

Use the focused validation path first:

- `cd SynAI; .\packages\Agent-Runtime\scripts\validate-agent-foundation.ps1`

Use the underlying commands when you need to run one piece directly:

- `cd SynAI; npx tsc -p tsconfig.agent-runtime.json --noEmit`
- `cd SynAI; npx jest --runInBand --config jest.agent-runtime.config.cjs packages/Agent-Runtime/tests`
- `cd SynAI; npx vitest run packages/Agent-Runtime/vitest/agent/contracts/agent-runtime.contracts.test.ts`

When touching Electron orchestration or governance execution, add the relevant SynAI Vitest targets on top of the foundation script.

## Rules For Future Model Runs

- Read this guide, `SynAI/packages/Agent-Runtime/context/REPO_MAP.yaml`, `SynAI/packages/Agent-Runtime/context/BLAST_RADIUS_MANIFEST.yaml`, `SynAI/packages/Agent-Runtime/context/GLOSSARY.yaml`, and the relevant layer spec before coding.
- Treat `SynAI/packages/Agent-Runtime/docs/AGENT_RUNTIME_FOUNDATION.md` and `SynAI/docs/AGENT_INSERTION_POINTS.md` as the current boundary map if they conflict with older implementation notes.
- Keep changes as small and local as possible.
- Prefer additive, typed, and test-backed changes over hidden behavior.
- Do not fake a future layer by adding real side effects early.
- If a change touches shared contracts, update both the canonical runtime package tests and the SynAI compatibility tests in the same pass.
- Preserve deterministic status transitions, audit events, and approval semantics.
