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
    }
    const result = await runSkill(skill);
    return { ok: true, tool_id: 'windows_skill_pack_execute', summary: 'Executed ' + skill.id + ' via ' + skill.executor + '.', data: { skill_id: skill.id, title: skill.title, executor: skill.executor, execution_result: result }, warnings: [], errors: [], meta: { module: 'windows-js-skill-pack', matchedBy: resolved.matchedBy } };
  }
};
