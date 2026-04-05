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
  resolveSkill,
};
