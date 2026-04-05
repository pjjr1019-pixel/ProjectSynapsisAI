---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/registry/tool_aliases.json"
source_name: "tool_aliases.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 104
selected_rank: 560
content_hash: "aa092774c68e449c6772601ff2a8d6181d5476bfa99e432e726140cfa707ed7f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "scripts"
json_keys:
  - "find windows setting"
  - "kill process 1234"
  - "launch windows tool"
  - "open control panel item"
  - "open windows setting"
  - "run windows skill pack"
  - "show auto start services"
  - "show diagnostics report"
  - "show listening ports"
  - "show network connections"
  - "show network diagnostics"
  - "show process command line"
  - "show process details"
  - "show process tree"
  - "show protected processes"
---

# taskmanager/brain/scripts/registry/tool_aliases.json

> Script surface; keys find windows setting, kill process 1234, launch windows tool, open control panel item, open windows setting, run windows skill pack

## Key Signals

- Source path: taskmanager/brain/scripts/registry/tool_aliases.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 104
- Tags: brain, brain-scripts, json, neutral, scripts
- JSON keys: find windows setting, kill process 1234, launch windows tool, open control panel item, open windows setting, run windows skill pack, show auto start services, show diagnostics report, show listening ports, show network connections

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/registry/tool_aliases.json

## Excerpt

~~~json
{
  "show top ram apps": "top_memory_processes",
  "what is using cpu": "top_cpu_processes",
  "show startup apps": "list_startup_entries",
  "kill process 1234": "kill_process_by_pid",
  "show listening ports": "list_listening_ports",
  "show running processes": "list_running_processes",
  "show process tree": "process_tree_by_pid",
  "show process command line": "process_command_line",
  "show process details": "process_details_by_pid",
  "show services": "running_services",
  "show stopped services": "stopped_services",
  "show auto start services": "auto_start_services",
  "show scheduled tasks": "scheduled_tasks_summary",
  "show network connections": "list_established_connections",
  "show network diagnostics": "local_network_diagnostics_summary",
  "show temp cleanup candidates": "temp_cleanup_candidates",
  "show diagnostics report": "generate_diagnostics_report",
  "show readiness report": "generate_machine_readiness_report",
  "show protected processes": "protected_processes",
  "show protected services": "protected_services",
  "open windows setting": "windows_skill_pack_lookup",
  "find windows setting": "windows_skill_pack_lookup",
  "open control panel item": "windows_skill_pack_lookup",
  "launch windows tool": "windows_skill_pack_execute",
  "run windows skill pack": "windows_skill_pack_lookup"
}
~~~