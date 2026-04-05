---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/windows_skill_pack_lookup.js"
source_name: "windows_skill_pack_lookup.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 114
selected_rank: 117
content_hash: "f10e237c945dfb304d51e8cc8fe3eabfaa3d1699a229c37c0353d7f1030a1b16"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
imports:
  - "./tools/router"
  - "./tools/skillRegistry"
exports:
  - "handler: async (input = {"
---

# taskmanager/brain/scripts/windows/windows_skill_pack_lookup.js

> Script surface; imports ./tools/router, ./tools/skillRegistry; exports handler: async (input = {

## Key Signals

- Source path: taskmanager/brain/scripts/windows/windows_skill_pack_lookup.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 114
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ./tools/router, ./tools/skillRegistry
- Exports: handler: async (input = {

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/windows_skill_pack_lookup.js

## Excerpt

~~~javascript
const { getSkillById, searchSkills } = require('./tools/skillRegistry');
const { resolveSkill } = require('./tools/router');

function toOutputRow(row) {
  return {
    skill_id: row.id,
    title: row.title,
    category: [row.group, row.subgroup].filter(Boolean).join('.'),
    executor: row.executor,
    risk: row.risk || 'safe',
    aliases: row.aliases || []
  };
}

module.exports = {
  handler: async (input = {}) => {
    const query = String(input.query || input.skill_id || '').trim();
    const limit = Number.isFinite(Number(input.limit)) ? Number(input.limit) : 5;
    if (!query) {
      return { ok: false, tool_id: 'windows_skill_pack_lookup', summary: 'Missing query.', data: { items: [] }, warnings: ['Provide query or skill_id.'], errors: ['missing_query'], meta: { module: 'windows-js-skill-pack' } };
    }
    const direct = getSkillById(query);
    if (direct) {
      return { ok: true, tool_id: 'windows_skill_pack_lookup', summary: 'Exact skill id match.', data: { match: toOutputRow(direct), candidates: [] }, warnings: [], errors: [], meta: { matchedBy: 'id', confidence: 1.0 } };
    }
    const resolved = resolveSkill(query);
    const candidates = searchSkills(query, limit).map((x) => ({ ...toOutputRow(x.skill), score: x.score }));
    return {
~~~