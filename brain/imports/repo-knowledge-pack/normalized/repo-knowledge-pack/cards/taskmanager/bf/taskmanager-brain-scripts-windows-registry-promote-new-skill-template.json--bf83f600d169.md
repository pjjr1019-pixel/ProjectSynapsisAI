---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/registry/promote-new-skill-template.json"
source_name: "promote-new-skill-template.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 104
selected_rank: 563
content_hash: "f93da22ffff2fcfd31c0bb9da3e4f187d31d1f6fedf1589e778ccaa763b94eff"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "scripts"
json_keys:
  - "aliases"
  - "args"
  - "command"
  - "executor"
  - "group"
  - "id"
  - "notes"
  - "risk"
  - "subgroup"
  - "title"
---

# taskmanager/brain/scripts/windows/registry/promote-new-skill-template.json

> Script surface; keys aliases, args, command, executor, group, id

## Key Signals

- Source path: taskmanager/brain/scripts/windows/registry/promote-new-skill-template.json
- Surface: brain-scripts
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 104
- Tags: brain, brain-scripts, json, neutral, scripts
- JSON keys: aliases, args, command, executor, group, id, notes, risk, subgroup, title

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/registry/promote-new-skill-template.json

## Excerpt

~~~json
{
  "id": "tool.example-skill",
  "title": "Example Skill",
  "group": "tool",
  "subgroup": "custom",
  "executor": "command",
  "command": "notepad.exe",
  "args": [],
  "risk": "safe",
  "aliases": [
    "example skill",
    "open example skill"
  ],
  "notes": "Copy into one of the source data files and rebuild INDEX.json."
}
~~~