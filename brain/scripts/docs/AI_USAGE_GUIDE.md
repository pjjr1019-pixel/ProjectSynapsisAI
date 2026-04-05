# AI Usage Guide

This pack provides a Windows-backed Task Manager style tool layer for AI orchestration.

## Registry

- Registry index: `registry/tools_index.json`
- Aliases: `registry/tool_aliases.json`
- Playbooks: `registry/playbooks.json`
- Quick lookup: `registry/TOOL_QUICK_LOOKUP.md`

## How to find tools fast

1. Run `node run-tool.js registry_search --query "<intent>"`.
2. Read the top tool ids and aliases.
3. Run the tool by id with explicit arguments.

## Risk model

- `low`: read-only inspection.
- `medium`: limited or reversible action with dry-run support.
- `high`: destructive or service/process control action and requires approval.
- `critical`: protected or stability-sensitive action and requires approval.

Current counts: {"total":55,"risks":{"low":50,"medium":0,"high":5,"critical":0},"categories":{"process":17,"system":8,"services":9,"startup":6,"network":5,"cleanup":6,"policy":4}}

## Aliases and playbooks

Alias phrases map human intent to tool ids. Playbooks chain multiple tools for common workflows like triage, startup audit, and diagnostics bundles.

## Runner usage

- `node run-tool.js list_tools`
- `node run-tool.js tool_info --id top_memory_processes`
- `node run-tool.js registry_search --query "list services"`
- `node run-tool.js top_memory_processes --limit 15`
- `node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false`

## Notes for orchestration

- Prefer preview commands before any high-risk action.
- Use exact process or service names when terminating or controlling a target.
- Treat protected processes and services as non-targets unless there is explicit escalation.
- Ask for the smallest useful tool result set first.

Loaded aliases: 20; playbooks: 8.

## Repo knowledge pack

- Generate the whole-repo lookup pack with `npm run brain:repo-knowledge-pack` from `taskmanager/`.
- Refresh it incrementally with `npm run brain:repo-knowledge-pack:update` after normal edits.
- The pack lands under `taskmanager/brain/imports/repo-knowledge-pack/` with markdown cards, a full file-map JSONL, and summary indexes.
- Retrieval docs live under `taskmanager/brain/retrieval/imports/repo-knowledge-pack/` and the dedicated retrieval profile is `repo-knowledge-pack`.
