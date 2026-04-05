---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/registry/playbooks.json"
source_name: "playbooks.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 104
selected_rank: 552
content_hash: "e513e98c21d587535813fffb8726929700d4b5417900a1996fec9461a01f3aee"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/registry/playbooks.json

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/registry/playbooks.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 104
- Tags: brain, brain-scripts, json, neutral, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/registry/playbooks.json

## Excerpt

~~~json
[
  {
    "id": "system_triage_read_only",
    "title": "System triage (read-only)",
    "description": "Collects a quick system/process/network snapshot without changing anything.",
    "steps": [
      "system_summary",
      "top_cpu_processes",
      "top_memory_processes",
      "list_listening_ports",
      "service_status_summary",
      "list_startup_entries"
    ],
    "risk_level": "low"
  },
  {
    "id": "process_kill_preflight",
    "title": "Process kill preflight",
    "description": "Checks policy and previews candidate processes before a kill action.",
    "steps": [
      "preflight_for_process_action",
      "find_processes_by_query",
      "critical_process_matches"
    ],
    "risk_level": "medium"
  },
  {
    "id": "service_restart_preflight",
~~~