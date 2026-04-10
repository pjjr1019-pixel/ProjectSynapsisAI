# SynAI Agent Guide

Read this first before editing agent, runtime, policy, or orchestration code.

SynAI today is a Windows-first local desktop app with a real chat shell, memory/context pipeline, and governed execution stack. It is not yet a full autonomous Windows agent. The current posture is foundation-first: the repo favors small, typed contracts, preview paths, and deterministic mock-backed behavior over fake completeness.

## What SynAI Is Right Now

- `SynAI/apps/desktop/` is the Electron app: main process, preload bridge, and React renderer.
- `SynAI/packages/Awareness-Reasoning/src/` owns memory storage, prompt context assembly, local AI, screen/machine/file awareness, retrieval, web search, and capability-eval plumbing.
- `SynAI/packages/Governance and exicution/src/` owns governance policy, approvals, command hashing/bus, Windows action catalog, execution helpers, and remediation.
- `src/agent/` is the canonical agent foundation for the repo. `SynAI/src/agent/` is only a compatibility shim that re-exports that foundation into the app tree.
- `tests/agent/` is the root Jest suite for the agent foundation. `SynAI/tests/agent/contracts/` adds schema coverage for the app-facing shim.

## What Already Works And Must Not Break

- The canonical contract set in `src/agent/contracts/agent-runtime.contracts.ts` defines the core task, step, skill, execution, observation, verification, policy, audit, job, and checkpoint shapes.
- The no-op runtime in `src/agent/runtime/noop-runtime.ts` already runs a task through planner, policy, executor, perception, verifier, and audit paths.
- The default skills are intentionally tiny: `echo_text` and `mock_open_app`.
- The Electron main process already exposes `agentRuntimeRun` through IPC, so the runtime surface is part of the app contract.
- Existing chat, memory, context preview, workflow orchestration, and capability-eval flows already depend on these shapes. Changing them without mirror updates will ripple into the app.

## Current App Shape

- `src/agent/` is the source of truth for future agent work. Keep new agent logic there first.
- `SynAI/src/agent/` should stay thin. Use it for re-exports or compatibility wrappers, not for new business logic.
- `SynAI/apps/desktop/electron/` is the main-process boundary. Keep orchestration, IPC, and side effects there.
- `SynAI/apps/desktop/src/` is renderer-only UI: chat, history, tools, settings, memory, workflow cards, and preview panels.
- `SynAI/packages/Awareness-Reasoning/src/` is shared reasoning and storage code, not UI.
- `SynAI/packages/Governance and exicution/src/` is shared policy/execution code, not renderer code.
- `SynAI/capability/` and `SynAI/tests/capability/` are the behavioral eval harness, not the production runtime.

## Where Future Agent Code Should Live

Put future agent subsystems under `src/agent/<subsystem>/`, with contracts in `src/agent/contracts/`. Likely subtrees are `core`, `skills`, `planner`, `executor`, `perception`, `policy`, `runtime`, `verifier`, `audit`, and `evals`.

If the app needs the same surface, add or adjust the `SynAI/src/agent/` re-exports, but do not move the source of truth out of `src/agent/`.

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
- Editing `SynAI/packages/Governance and exicution/src/policy/engine.ts`, approvals, or Windows action catalogs without behavior tests.
- Adding real Windows automation, process termination, destructive file operations, or network side effects before the policy/audit story is ready.

## Validation Commands

Use the focused validation path first:

- `.\scripts\validate-agent-foundation.ps1`

Use the underlying commands when you need to run one piece directly:

- `npx tsc -p tsconfig.agent-foundation.json --noEmit`
- `npx jest --runInBand --config jest.config.js tests/agent`
- `cd SynAI; npx vitest run tests/agent/contracts/agent-runtime.contracts.test.ts`

When touching Electron orchestration or governance execution, add the relevant SynAI vitest targets on top of the foundation script.

## Rules For Future Model Runs

- Read this guide, `context/REPO_MAP.yaml`, `context/BLAST_RADIUS_MANIFEST.yaml`, `context/GLOSSARY.yaml`, and the relevant layer spec before coding.
- Treat `docs/AGENT_RUNTIME_FOUNDATION_DRAFT.md` and `SynAI/docs/AGENT_INSERTION_POINTS.md` as background only if they conflict with this guide.
- Keep changes as small and local as possible.
- Prefer additive, typed, and test-backed changes over hidden behavior.
- Do not fake a future layer by adding real side effects early.
- If a change touches shared contracts, update both the root agent tests and the SynAI shim tests in the same pass.
- Preserve deterministic status transitions, audit events, and approval semantics.
