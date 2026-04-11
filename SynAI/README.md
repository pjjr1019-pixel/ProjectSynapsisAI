# SynAI Phase 1: Smart Local Chat Test Build

`SynAI/` is the actual app/package root. The repository root is only a bootstrap shell.

This folder is a clean staged rebuild focused on local chat intelligence:
- local Ollama chat
- conversation persistence
- memory extraction and keyword retrieval
- rolling summaries
- context assembly with inspectable preview
- optional recent web search for current-event prompts
- smoke tests for core behavior

## Intentionally Not Built Yet
- finance
- broad autonomous browser automation outside governed workflow steps
- cloud sync
- broad multi-agent systems
- launcher/dashboard extras

## Governed Desktop Actions
- Windows-first desktop actions are available through the governed Actions tab.
- The action surface is preview-first, audit-logged, and approval-gated for destructive or system-changing operations.
- The Workflow tab adds governed multi-step task planning for research, reports, app launch, system navigation, file work, process control, and uninstall flows.
- See [docs/architecture/governed-execution-roadmap.md](docs/architecture/governed-execution-roadmap.md) for the rollout shape.
- See [packages/Governance-Execution/README.md](packages/Governance-Execution/README.md) before extending governed actions or policy.

## Setup
1. `cd SynAI`
2. `npm install`
3. Copy `.env.example` to `.env` and fill `OLLAMA_MODEL` (and optional `OLLAMA_EMBED_MODEL`)
4. Keep `WEB_SEARCH_ENABLED=true` if you want SynAI to pull recent headlines/snippets for time-sensitive prompts.

## Ollama Setup
1. Install Ollama locally.
2. Pull your chat model, for example: `ollama pull llama3.2`
3. Ensure Ollama is running at `http://127.0.0.1:11434`

## Run
- Development desktop app: `npm run dev`
- Build: `npm run build`
- Tests: `npm test`
- Deterministic repo context: `npm run context:build`

## Repo Context Pipeline
- `SynAI/` is the primary app/package root. Treat the repository root as a bootstrap shell unless a task explicitly targets repo hygiene.
- The context pipeline exists so future coding passes can rely on deterministic repo facts instead of rereading the whole tree.
- Run `npm run context:scan` to regenerate machine-readable artifacts in `artifacts/`.
- Run `npm run context:refresh` to regenerate compact model-facing docs in `context/` from those artifacts.
- Run `npm run context:build` to do both in order.
- Generated outputs include:
  - `artifacts/repo-tree.json`, `file-hashes.json`, `imports.json`, `exports.json`
  - `artifacts/config-surfaces.json`, `package-boundaries.json`, `duplicate-candidates.json`
  - `context/AGENT_GUIDE.md`, `REPO_MAP.md`, `BLAST_RADIUS.md`, `ARCHITECTURE_SUMMARY.md`
  - `context/task-packs/*` and `context/file-notes/*`
- The pipeline is deterministic and docs-first: it highlights TS/JS config mirrors and other duplicate candidates without blindly deleting them.

## Recent Web Search
- Turn on `Use recent web search` in the chat input when you want fresh internet context.
- SynAI also auto-attempts recent web lookup for prompts like `latest`, `today`, `right now`, or `news`.
- Results are shown in the Context Preview panel with source names, snippets, and dates.

## Memory Strategy (High Level)
- New turns are scanned for candidate memories (preferences, constraints, goals, etc.).
- Importance scoring prioritizes durable user context.
- Similar memories are refreshed instead of endlessly duplicated.
- Keyword retrieval brings relevant memory into later prompts.

## Rolling Summaries
- Older conversation turns are compacted into a stored summary.
- Newer turns remain raw.
- Context assembly uses summary + retrieved/stable memory + recent messages within a budget.

## Testing Strategy
- Smoke tests validate shell layout, model health handling, persistence, extraction, keyword retrieval, rolling summaries, and context assembly.
- Capability and contract tests also protect governed actions, workflows, approvals, and audit boundaries.

## Extending Later
Add non-chat features in new feature folders and packages, keeping:
- provider logic in `packages/Awareness-Reasoning/src/local-ai`
- memory/context logic in `packages/Awareness-Reasoning/src/memory`
- UI wiring in `apps/desktop/src/features/*`
- canonical runtime work in `packages/Agent-Runtime/src`
- governed execution work in `packages/Governance-Execution/src`
