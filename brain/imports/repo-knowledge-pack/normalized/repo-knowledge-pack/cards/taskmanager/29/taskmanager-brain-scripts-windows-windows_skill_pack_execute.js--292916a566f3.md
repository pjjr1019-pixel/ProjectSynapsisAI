---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/windows_skill_pack_execute.js"
source_name: "windows_skill_pack_execute.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 108
selected_rank: 536
content_hash: "9cfb711eb804c837d439964751b9d978d05c76cde0cb5f02b2ca78b26b7ba745"
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
  - "./tools/runner"
  - "./tools/skillRegistry"
exports:
  - "handler: async (input = {"
---

# taskmanager/brain/scripts/windows/windows_skill_pack_execute.js

> Script surface; imports ./tools/router, ./tools/runner, ./tools/skillRegistry; exports handler: async (input = {

## Key Signals

- Source path: taskmanager/brain/scripts/windows/windows_skill_pack_execute.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, js, neutral, scripts
- Imports: ./tools/router, ./tools/runner, ./tools/skillRegistry
- Exports: handler: async (input = {

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/windows_skill_pack_execute.js

## Excerpt

~~~javascript
const { getSkillById } = require('./tools/skillRegistry');
const { resolveSkill } = require('./tools/router');
const { runSkill } = require('./tools/runner');

function isRisky(skill) {
  const r = String((skill && skill.risk) || 'safe').toLowerCase();
  return /admin|elevat|high|danger|risky/.test(r);
}

module.exports = {
  handler: async (input = {}) => {
    const query = String(input.query || input.skill_id || '').trim();
    const confirm = Boolean(input.confirm);
    const dryRun = Boolean(input.dry_run);
    if (!query) {
      return { ok: false, tool_id: 'windows_skill_pack_execute', summary: 'Missing query.', data: {}, warnings: ['Provide query or skill_id.'], errors: ['missing_query'], meta: { module: 'windows-js-skill-pack' } };
    }
    const direct = getSkillById(query);
    const resolved = direct ? { ok: true, skill: direct, matchedBy: 'id', score: 999 } : resolveSkill(query);
    if (!resolved.ok || !resolved.skill) {
      return { ok: false, tool_id: 'windows_skill_pack_execute', summary: 'No matching skill.', data: { candidates: [] }, warnings: ['Use windows_skill_pack_lookup first.'], errors: [resolved.error || 'no_match'], meta: { module: 'windows-js-skill-pack', fallbackTopN: 3 } };
    }
    const skill = resolved.skill;
    if (isRisky(skill) && !confirm) {
      return { ok: false, tool_id: 'windows_skill_pack_execute', summary: 'Confirmation required.', data: { skill_id: skill.id, risk: skill.risk || 'risky' }, warnings: ['Set confirm=true to execute.'], errors: ['confirmation_required'], meta: { requires_confirmation: true } };
    }
    if (dryRun) {
      return { ok: true, tool_id: 'windows_skill_pack_execute', summary: 'Dry run prepared.', data: { skill_id: skill.id, title: skill.title, executor: skill.executor, target: skill.target || null, command: skill.command || null, args: Array.isArray(skill.args) ? skill.args : [] }, warnings: [], errors: [], meta: { dry_run: true } };
~~~