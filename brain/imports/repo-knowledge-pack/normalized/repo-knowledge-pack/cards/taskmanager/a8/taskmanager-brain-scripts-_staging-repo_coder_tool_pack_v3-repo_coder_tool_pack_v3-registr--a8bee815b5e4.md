---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/registry/playbooks.json"
source_name: "playbooks.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 106
selected_rank: 542
content_hash: "99784f2fa018ce16371e1faee63ce7b9093185c9bdf1585b5b2a7a107d620338"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/registry/playbooks.json

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/registry/playbooks.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 106
- Tags: brain, brain-scripts, json, neutral, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/registry/playbooks.json

## Excerpt

~~~json
[
  {
    "id": "repo_fast_map",
    "title": "Repo fast map",
    "description": "Quickly map a repository for a weaker coding AI.",
    "steps": [
      "generate_low_token_pack",
      "generate_repo_brief",
      "likely_entrypoints",
      "likely_root_configs",
      "folder_role_guess",
      "package_name_inventory",
      "readme_inventory"
    ]
  },
  {
    "id": "cleanup_scan",
    "title": "Cleanup scan",
    "description": "Find duplicates, empties, and generated or stale files.",
    "steps": [
      "generate_cleanup_candidates_report",
      "empty_files",
      "empty_directories",
      "duplicate_filenames",
      "duplicate_file_content",
      "generated_file_candidates",
      "stale_files"
    ]
~~~