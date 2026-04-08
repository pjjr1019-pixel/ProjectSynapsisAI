# SynAI Phase 1: Smart Local Chat Test Build

This folder is a clean staged rebuild focused on local chat intelligence:
- local Ollama chat
- conversation persistence
- memory extraction and keyword retrieval
- rolling summaries
- context assembly with inspectable preview
- optional recent web search for current-event prompts
- smoke tests for core behavior

## Intentionally Not Built Yet
- task manager
- approvals/workflows
- finance
- browser automation
- cloud sync
- multi-agent systems
- launcher/dashboard extras

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
- This phase is intentionally small and test-first for chat intelligence only.

## Extending Later
Add non-chat features in new feature folders and packages, keeping:
- provider logic in `packages/local-ai`
- memory/context logic in `packages/memory`
- UI wiring in `apps/desktop/src/features/*`
