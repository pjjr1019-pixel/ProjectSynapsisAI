---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/examples/integration-snippet.js"
source_name: "integration-snippet.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3928
content_hash: "96e7ef2ed3444ce8cf7fd8944674ece59deca8d8196e6513bb03b80edcbc19e2"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "../src"
exports:
  - "openFromChat"
---

# taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/examples/integration-snippet.js

> Code module; imports ../src; exports openFromChat

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/examples/integration-snippet.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Imports: ../src
- Exports: openFromChat

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/examples/integration-snippet.js

## Excerpt

~~~javascript
const { resolveSkill, runSkill } = require("../src");

async function openFromChat(userText) {
  const result = resolveSkill(userText);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  const launch = await runSkill(result.skill);
  return {
    ok: true,
    matchedBy: result.matchedBy,
    skill: result.skill,
    launch,
  };
}

module.exports = { openFromChat };
~~~