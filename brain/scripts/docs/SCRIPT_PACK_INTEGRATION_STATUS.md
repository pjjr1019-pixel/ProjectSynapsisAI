# Script Pack Integration Status

Generated: 2026-04-01

## Scope Completed

This workspace now includes all three requested tracks:

1. Incremental promotion into active runtime.
2. Isolation and optional use of staged runners.
3. Commit-boundary preparation for clean history.

## 1) Incremental Promotion (Active Runtime)

A safe external bridge was added to the active runtime so selected staged-pack tools can be invoked from the main runner without replacing the current handler architecture.

Promoted tool ids:

- guarded_list_processes_ext
- guarded_list_listening_ports_ext
- guarded_list_services_ext
- repo_registry_search_ext
- repo_likely_entrypoints_ext
- repo_generate_low_token_pack_ext

Implementation locations:

- core bridge and handlers: `brain/scripts/core/runtime.js`
- promoted catalog entries and aliases: `brain/scripts/indexing/tool_catalog.js`

These promoted tools are low-risk, read-only integrations intended as an incremental bridge.

## 2) Isolation Policy (Staged Packs)

Staged packs remain isolated and runnable directly as optional external toolchains:

- `brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/run-tool.js`
- `brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/run-tool.js`
- `brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/run-tool.js`

Isolation intent:

- Avoid breaking the active runtime (`brain/scripts/run-tool.js`).
- Keep staged pack internals independent from active runtime handlers.
- Allow gradual promotion by adding explicit bridge handlers for selected tools.

## 3) Commit Boundary Plan

A dedicated commit-boundary document has been prepared:

- `brain/scripts/docs/COMMIT_BOUNDARIES.md`

It defines a practical split for specialist changes, scripts runtime changes, staging assets, and generated runtime/log artifacts.

## 4) Repo Knowledge Pack

A new whole-repo knowledge pack generator has been added for fast local lookup:

- Generator: `brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js`
- Package command: `npm run brain:repo-knowledge-pack`
- Incremental refresh: `npm run brain:repo-knowledge-pack:update`
- Output root: `taskmanager/brain/imports/repo-knowledge-pack/`
- Retrieval docs: `taskmanager/brain/retrieval/imports/repo-knowledge-pack/`

The pack is designed to make scripts, core brain files, and other high-signal surfaces easier for a local AI to search without re-scanning the whole repository by hand.

## Quick Verification Commands

From repo root:

- `node taskmanager/brain/scripts/run-tool.js list_tools --category external`
- `node taskmanager/brain/scripts/run-tool.js repo_registry_search_ext --query entrypoint --limit 3`
- `node taskmanager/brain/scripts/run-tool.js guarded_list_processes_ext --limit 3`

Staged direct runners:

- `node taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/run-tool.js list_processes --limit 3`
- `node taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/run-tool.js registry_search --query entrypoint --limit 3`
