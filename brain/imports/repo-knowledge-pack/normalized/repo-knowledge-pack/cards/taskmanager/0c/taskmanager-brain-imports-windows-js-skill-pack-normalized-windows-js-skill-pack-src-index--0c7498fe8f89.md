---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/index.js"
source_name: "index.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 75
selected_rank: 3901
content_hash: "0e3c365a80621cdf38558af49483ac42153d9c66914af3c00eac082a5816bb24"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "code"
  - "index"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./router"
  - "./runner"
  - "./skillRegistry"
exports:
  - "getAllSkills,\n  getSkillById,\n  searchSkills,\n  resolveSkill,\n  runSkill,"
---

# taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/index.js

> Code module; imports ./router, ./runner, ./skillRegistry; exports getAllSkills,
  getSkillById,
  searchSkills,
  resolveSkill,
  runSkill,

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/index.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 75
- Tags: brain, brain-imports, code, index, js, neutral, scripts
- Imports: ./router, ./runner, ./skillRegistry
- Exports: getAllSkills,
  getSkillById,
  searchSkills,
  resolveSkill,
  runSkill,

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, index, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/index.js

## Excerpt

~~~javascript
const { getAllSkills, getSkillById, searchSkills } = require("./skillRegistry");
const { resolveSkill } = require("./router");
const { runSkill } = require("./runner");

module.exports = {
  getAllSkills,
  getSkillById,
  searchSkills,
  resolveSkill,
  runSkill,
};
~~~