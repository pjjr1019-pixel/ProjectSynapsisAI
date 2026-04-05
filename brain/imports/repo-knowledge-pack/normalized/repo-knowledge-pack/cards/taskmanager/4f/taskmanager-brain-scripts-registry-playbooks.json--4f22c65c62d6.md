---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/registry/playbooks.json"
source_name: "playbooks.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 104
selected_rank: 559
content_hash: "36886b2a0416e5c702bfab17ed2ab3db90786153f654aaa1027f0a92c68e9acb"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/registry/playbooks.json

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/registry/playbooks.json
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
- Source link target: taskmanager/brain/scripts/registry/playbooks.json

## Excerpt

~~~json
[
  {
    "id": "process_triage",
    "title": "Process triage",
    "description": "Inspect hotspots, classify risk, and decide whether a process should be left alone or killed.",
    "steps": [
      "Run top_cpu_processes and top_memory_processes.",
      "Run process_details_by_pid or process_details_by_name for the suspicious target.",
      "Run process_action_policy and dry_run_kill_process_by_pid if the target is eligible."
    ],
    "tools": [
      "top_cpu_processes",
      "top_memory_processes",
      "process_details_by_pid",
      "process_action_policy",
      "dry_run_kill_process_by_pid"
    ]
  },
  {
    "id": "local_ai_readiness_scan",
    "title": "Local AI readiness scan",
    "description": "Collect the current system posture for local AI work.",
    "steps": [
      "Run machine_summary, cpu_summary, memory_summary, and disk_usage_summary.",
      "Run process_health_snapshot and basic_network_activity_summary.",
      "Run generate_machine_readiness_report for a compact summary."
    ],
    "tools": [
~~~