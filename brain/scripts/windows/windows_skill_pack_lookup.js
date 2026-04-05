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
      ok: resolved.ok,
      tool_id: 'windows_skill_pack_lookup',
      summary: resolved.ok ? ('Resolved query to ' + resolved.skill.id + '.') : 'No exact match.',
      data: { match: resolved.ok ? toOutputRow(resolved.skill) : null, candidates },
      warnings: resolved.ok ? [] : ['Low-confidence or no match. Returning candidates.'],
      errors: resolved.ok ? [] : [resolved.error || 'no_match'],
      meta: { matchedBy: resolved.matchedBy || 'search', confidence: resolved.ok && resolved.score ? Math.min(1, resolved.score / 200) : 0, fallbackTopN: 3 }
    };
  }
};
