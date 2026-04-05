---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/tools/cli.js"
source_name: "cli.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 531
content_hash: "2981937e5d4cfe8a1bcb3a79ec1906376020c4b3c190d966d3e9baa8362a0fdc"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./index"
---

# taskmanager/brain/scripts/windows/tools/cli.js

> Script surface; imports ./index

## Key Signals

- Source path: taskmanager/brain/scripts/windows/tools/cli.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ./index

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/tools/cli.js

## Excerpt

~~~javascript
#!/usr/bin/env node
const { getAllSkills, searchSkills, resolveSkill, runSkill } = require("./index");

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log([
      "Usage:",
      "  node src/cli.js list",
      "  node src/cli.js search \"bluetooth settings\"",
      "  node src/cli.js open \"bluetooth settings\"",
      "  node src/cli.js open-id settings.devices.bluetooth",
      "  node src/cli.js doctor",
    ].join("\n"));
    return;
  }

  if (command === "list") {
    printJson(getAllSkills());
    return;
  }

  if (command === "search") {
~~~