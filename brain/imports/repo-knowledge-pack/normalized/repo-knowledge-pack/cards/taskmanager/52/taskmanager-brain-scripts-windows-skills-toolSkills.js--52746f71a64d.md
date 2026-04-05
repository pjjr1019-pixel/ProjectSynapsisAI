---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/skills/toolSkills.js"
source_name: "toolSkills.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 530
content_hash: "b61fefc00b9a668512b692c395be8e983baded97d0a57ec2c58792eca5cea7a3"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/windows/skills/toolSkills.js

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/windows/skills/toolSkills.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/skills/toolSkills.js

## Excerpt

~~~javascript
module.exports = [
  {
    "id": "tool.task-manager",
    "title": "Task Manager",
    "group": "tool",
    "subgroup": "system-tools",
    "executor": "command",
    "command": "taskmgr.exe",
    "args": [],
    "target": "taskmgr.exe",
    "risk": "safe",
    "aliases": [
      "go to task manager",
      "open task manager",
      "open task manager system tool",
      "open task manager tool",
      "open task manager windows tool",
      "show task manager",
      "task manager",
      "task manager system tool",
      "task manager tool",
      "task manager windows tool"
    ],
    "notes": "Standard Windows tool launch."
  },
  {
    "id": "tool.device-manager",
    "title": "Device Manager",
~~~