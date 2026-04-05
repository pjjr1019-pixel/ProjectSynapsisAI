---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/skills/folderSkills.js"
source_name: "folderSkills.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 528
content_hash: "466904d38b25ccf71b16e8c8b9fcee638bc06f59015295ae5ac0d6c929c6b658"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/windows/skills/folderSkills.js

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/windows/skills/folderSkills.js
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
- Source link target: taskmanager/brain/scripts/windows/skills/folderSkills.js

## Excerpt

~~~javascript
module.exports = [
  {
    "id": "folder.desktop",
    "title": "Desktop",
    "group": "folder",
    "subgroup": "shell-folders",
    "executor": "shellFolder",
    "target": "shell:Desktop",
    "risk": "safe",
    "aliases": [
      "desktop",
      "desktop folder",
      "desktop location",
      "go to desktop",
      "open desktop",
      "open desktop folder",
      "open desktop location",
      "show desktop"
    ],
    "notes": "Explorer shell folder target."
  },
  {
    "id": "folder.downloads",
    "title": "Downloads",
    "group": "folder",
    "subgroup": "shell-folders",
    "executor": "shellFolder",
    "target": "shell:Downloads",
~~~