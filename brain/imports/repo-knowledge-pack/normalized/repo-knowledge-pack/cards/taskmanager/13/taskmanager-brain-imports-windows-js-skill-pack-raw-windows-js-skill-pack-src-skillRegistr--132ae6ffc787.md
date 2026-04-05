---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/skillRegistry.js"
source_name: "skillRegistry.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3941
content_hash: "98093c9c1981aa1114eab2460e8079d682fa100c91f1a15d0564c4a88b76636c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./data/controlPanelSkills"
  - "./data/folderSkills"
  - "./data/settingsSkills"
  - "./data/toolSkills"
  - "./utils/normalize"
exports:
  - "getAllSkills,\n  getSkillById,\n  searchSkills,"
---

# taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/skillRegistry.js

> Code module; imports ./data/controlPanelSkills, ./data/folderSkills, ./data/settingsSkills, ./data/toolSkills; exports getAllSkills,
  getSkillById,
  searchSkills,

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/skillRegistry.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Imports: ./data/controlPanelSkills, ./data/folderSkills, ./data/settingsSkills, ./data/toolSkills, ./utils/normalize
- Exports: getAllSkills,
  getSkillById,
  searchSkills,

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/src/skillRegistry.js

## Excerpt

~~~javascript
const settingsSkills = require("./data/settingsSkills");
const controlPanelSkills = require("./data/controlPanelSkills");
const toolSkills = require("./data/toolSkills");
const folderSkills = require("./data/folderSkills");
const { normalizeText, tokenize } = require("./utils/normalize");

const ALL_SKILLS = [
  ...settingsSkills,
  ...controlPanelSkills,
  ...toolSkills,
  ...folderSkills,
];

function getAllSkills() {
  return ALL_SKILLS.slice();
}

function getSkillById(id) {
  return ALL_SKILLS.find((skill) => skill.id === id) || null;
}

function scoreSkill(skill, query) {
  const q = normalizeText(query);
  const qTokens = tokenize(query);
  if (!q) return 0;

  let score = 0;
  const title = normalizeText(skill.title);
~~~