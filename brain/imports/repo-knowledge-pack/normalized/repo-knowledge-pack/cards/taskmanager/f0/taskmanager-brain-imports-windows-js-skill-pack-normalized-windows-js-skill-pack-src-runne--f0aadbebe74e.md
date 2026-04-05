---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/runner.js"
source_name: "runner.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3925
content_hash: "8946286b64c2c866d7a7b7b4208006b944f883957533f1c794e74a9ddb74f3fa"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./executors/command"
  - "./executors/controlPanel"
  - "./executors/shellFolder"
  - "./executors/uri"
exports:
  - "runSkill,"
---

# taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/runner.js

> Code module; imports ./executors/command, ./executors/controlPanel, ./executors/shellFolder, ./executors/uri; exports runSkill,

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/runner.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Imports: ./executors/command, ./executors/controlPanel, ./executors/shellFolder, ./executors/uri
- Exports: runSkill,

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/runner.js

## Excerpt

~~~javascript
const { runUri } = require("./executors/uri");
const { runControlPanel } = require("./executors/controlPanel");
const { runCommand } = require("./executors/command");
const { runShellFolder } = require("./executors/shellFolder");

async function runSkill(skill) {
  if (!skill || !skill.executor) {
    throw new Error("Invalid skill.");
  }

  switch (skill.executor) {
    case "uri":
      return runUri(skill.target);
    case "controlPanel":
      return runControlPanel(skill.target);
    case "command":
      return runCommand(skill.command || skill.target, skill.args || []);
    case "shellFolder":
      return runShellFolder(skill.target);
    default:
      throw new Error(`Unsupported executor: ${skill.executor}`);
  }
}

module.exports = {
  runSkill,
};
~~~