---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/tools/createIndex.js"
source_name: "createIndex.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 122
selected_rank: 29
content_hash: "2972fadaa6fe2fba6c6a38fd53d358465419fdce34cbba9448cb190d6a1fe4ea"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "index"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./data/controlPanelSkills"
  - "./data/folderSkills"
  - "./data/settingsSkills"
  - "./data/toolSkills"
  - "node:fs"
  - "node:path"
---

# taskmanager/brain/scripts/windows/tools/createIndex.js

> Script surface; imports ./data/controlPanelSkills, ./data/folderSkills, ./data/settingsSkills, ./data/toolSkills

## Key Signals

- Source path: taskmanager/brain/scripts/windows/tools/createIndex.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-scripts, code, index, js, neutral, scripts
- Imports: ./data/controlPanelSkills, ./data/folderSkills, ./data/settingsSkills, ./data/toolSkills, node:fs, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, index, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/tools/createIndex.js

## Excerpt

~~~javascript
const fs = require("node:fs");
const path = require("node:path");
const settingsSkills = require("./data/settingsSkills");
const controlPanelSkills = require("./data/controlPanelSkills");
const toolSkills = require("./data/toolSkills");
const folderSkills = require("./data/folderSkills");

const skills = [
  ...settingsSkills,
  ...controlPanelSkills,
  ...toolSkills,
  ...folderSkills,
];

const counts = {
  total: skills.length,
  settings: settingsSkills.length,
  controlpanel: controlPanelSkills.length,
  tool: toolSkills.length,
  folder: folderSkills.length,
};

const payload = {
  name: "windows-js-skill-pack",
  version: "0.1.0",
  counts,
  skills,
};
~~~