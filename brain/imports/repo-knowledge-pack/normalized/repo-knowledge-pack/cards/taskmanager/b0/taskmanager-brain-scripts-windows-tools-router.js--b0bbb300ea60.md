---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/tools/router.js"
source_name: "router.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 532
content_hash: "aa6fd685cc0d337aefe85eb6cd41355563c5cfdc175084844a568c55e3d2b1cb"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./skillRegistry"
exports:
  - "resolveSkill,"
---

# taskmanager/brain/scripts/windows/tools/router.js

> Script surface; imports ./skillRegistry; exports resolveSkill,

## Key Signals

- Source path: taskmanager/brain/scripts/windows/tools/router.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ./skillRegistry
- Exports: resolveSkill,

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/tools/router.js

## Excerpt

~~~javascript
const { getSkillById, searchSkills } = require("./skillRegistry");

function resolveSkill(input) {
  if (!input || !String(input).trim()) {
    return { ok: false, error: "Missing query." };
  }

  const maybeId = getSkillById(String(input).trim());
  if (maybeId) {
    return { ok: true, skill: maybeId, matchedBy: "id", score: 999 };
  }

  const hits = searchSkills(input, 5);
  if (!hits.length) {
    return { ok: false, error: `No matching skill found for: ${input}` };
  }

  const [best, ...rest] = hits;
  return {
    ok: true,
    skill: best.skill,
    matchedBy: "search",
    score: best.score,
    alternatives: rest,
  };
}

module.exports = {
~~~