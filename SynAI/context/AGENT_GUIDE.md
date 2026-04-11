<!-- doc:AGENT_GUIDE; input-hash:0a8f8a660bc393d65feaf52bd91cfccd331f6cbfe41b56ab21e0b6f41f0c1781 -->
# SynAI Agent Guide

## Root Model
- `SynAI` is the canonical app/package root.
- The repository root is a bootstrap shell only; do not flatten it with the app code surface.
- Root-level `context`, `docs`, `scripts`, `specs`, `src`, and `tests` are secondary support surfaces unless a task explicitly targets them.

## Start Here
- Read `SynAI/context/REPO_MAP.md` for boundaries and high-signal entrypoints.
- Read `SynAI/context/BLAST_RADIUS.md` before editing workflow, governance, runtime, or config surfaces.
- Use `npm run context:build` from `SynAI/` after structural changes so the deterministic context stays fresh.

## Canonical Config Candidates
- `SynAI/.env.example` (env-example)
- `SynAI/apps/vscode-capability-testing/package.json` (package-manifest)
- `SynAI/apps/vscode-capability-testing/tsconfig.json` (tsconfig)
- `SynAI/electron.vite.config.ts` (electron-vite)
- `SynAI/jest.agent-runtime.config.cjs` (jest)
- `SynAI/package.json` (package-manifest)
- `SynAI/packages/Governance-Execution/package.json` (package-manifest)
- `SynAI/postcss.config.js` (postcss)

## Duplicate Handling
- TS/JS twins are documented first, not mass-deleted.
- Treat TypeScript config variants as canonical candidates where tooling already references them.
- `SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.js` is the current candidate over `SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.tsx`
- `SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts` is the current candidate over `SynAI/packages/Awareness-Reasoning/src/memory/storage/db.js`
- `SynAI/apps/desktop/src/shared/utils/id.ts` is the current candidate over `SynAI/apps/desktop/src/shared/utils/id.js`
- `SynAI/tests/capability/gap-classifier.test.ts` is the current candidate over `SynAI/tests/capability/gap-classifier.test.js`
- `SynAI/apps/desktop/src/shared/utils/time.ts` is the current candidate over `SynAI/apps/desktop/src/shared/utils/time.js`
- `SynAI/apps/desktop/electron/main.ts` is the current candidate over `SynAI/apps/desktop/electron/main.js`
- `SynAI/packages/Agent-Runtime/src/verifier/index.ts` is the current candidate over `SynAI/packages/Agent-Runtime/src/verifier/index.js`
- `SynAI/tests/capability/runner.test.ts` is the current candidate over `SynAI/tests/capability/runner.test.js`

## Status Semantics
- Preserve `clarification_needed` as distinct from `blocked`, `failed`, `completed`, and `running/pending` states.
- Keep clarification payloads observable, including human-readable prompts and any `missingFields` detail.

## Useful Commands
- `npm run context:scan`
- `npm run context:refresh`
- `npm run context:build`
- `npm test -- tests/capability/desktop-actions-clarification.test.ts tests/capability/governed-chat-service.test.ts tests/capability/workflow-orchestrator.test.ts`
- `npx jest --runInBand --config jest.agent-runtime.config.cjs packages/Agent-Runtime/tests/runtime/runtime.noop.test.ts`

