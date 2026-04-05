---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/registry/TOOL_QUICK_LOOKUP.md"
source_name: "TOOL_QUICK_LOOKUP.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 112
selected_rank: 130
content_hash: "3b4762066de3bde8705bc507395a6e86272f49757a3f71f27f2fb8f9ccacfec7"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "scripts"
headings:
  - "Categories"
  - "cleanup (6)"
  - "Common Aliases"
  - "Fast Commands"
  - "network (5)"
  - "policy (4)"
  - "process (17)"
  - "Tool Quick Lookup"
---

# taskmanager/brain/scripts/registry/TOOL_QUICK_LOOKUP.md

> Script surface; headings Categories / cleanup (6) / Common Aliases

## Key Signals

- Source path: taskmanager/brain/scripts/registry/TOOL_QUICK_LOOKUP.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: Categories | cleanup (6) | Common Aliases | Fast Commands | network (5) | policy (4)

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/registry/TOOL_QUICK_LOOKUP.md

## Excerpt

~~~markdown
# Tool Quick Lookup

Use `run-tool.js` for discovery and execution. Search the registry first, then run the tool by id.

## Fast Commands

- `node run-tool.js list_tools`
- `node run-tool.js registry_search --query "top memory"`
- `node run-tool.js top_memory_processes --limit 15`
- `node run-tool.js kill_process_by_pid --pid 1234 --approve true --dry_run false`

## Common Aliases

- show top ram apps -> top_memory_processes
- what is using cpu -> top_cpu_processes
- show startup apps -> list_startup_entries
- kill process 1234 -> kill_process_by_pid
- show listening ports -> list_listening_ports
- show running processes -> list_running_processes
- show process tree -> process_tree_by_pid
- show process command line -> process_command_line
- show process details -> process_details_by_pid
- show services -> running_services
- show stopped services -> stopped_services
- show auto start services -> auto_start_services
- show scheduled tasks -> scheduled_tasks_summary
- show network connections -> list_established_connections
- show network diagnostics -> local_network_diagnostics_summary
~~~