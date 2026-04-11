<!-- doc:task-pack:tests; input-hash:1f6255777a11751478213159f3dad5a36bab0a1586760ace6bd3dd82aecacda1 -->
# Tests Pack

## Start Narrow
- Vitest app/capability tests: `npm test -- <target files>`.
- Agent runtime Jest tests: `npx jest --runInBand --config jest.agent-runtime.config.cjs <target>`.
- Context pipeline tests: `npm test -- tests/context/context-pipeline.test.ts`.

## Keep Relevant
- Prefer the smallest set that covers the changed contract or behavior.
- Add status/clarification assertions where semantics are adapted or rendered.

## Keep Narrow
- Prefer `SynAI/` edits over root-shell edits.
- Do not casually delete TS/JS twins; use documented canonical candidates and leave ambiguity documented if proof is weak.
- Refresh deterministic context after structural changes with `npm run context:build`.

