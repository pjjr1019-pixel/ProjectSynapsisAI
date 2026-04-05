const settingsSkills = require("./data/settingsSkills");
const controlPanelSkills = require("./data/controlPanelSkills");
const toolSkills = require("./data/toolSkills");
const folderSkills = require("./data/folderSkills");
const { normalizeText, tokenize } = require("./utils/normalize");

const ALL_SKILLS = [
  ...settingsSkills,
  ...controlPanelSkills,
  ...toolSkills,
  ...folderSkills,
];

function getAllSkills() {
  return ALL_SKILLS.slice();
}

function getSkillById(id) {
  return ALL_SKILLS.find((skill) => skill.id === id) || null;
}

function scoreSkill(skill, query) {
  const q = normalizeText(query);
  const qTokens = tokenize(query);
  if (!q) return 0;

  let score = 0;
  const title = normalizeText(skill.title);
  const id = normalizeText(skill.id);
  const target = normalizeText(skill.target || "");
  const aliases = (skill.aliases || []).map(normalizeText);

  if (title === q) score += 120;
  if (id === q) score += 150;
  if (aliases.includes(q)) score += 140;
  if (title.includes(q)) score += 50;
  if (id.includes(q)) score += 70;
  if (target.includes(q)) score += 30;

  for (const alias of aliases) {
    if (alias.includes(q)) score += 45;
  }

  for (const token of qTokens) {
    if (title.includes(token)) score += 8;
    if (id.includes(token)) score += 10;
    if (target.includes(token)) score += 4;
    for (const alias of aliases) {
      if (alias.includes(token)) score += 6;
    }
  }

  if (skill.group && q.includes(skill.group)) score += 6;
  if (skill.subgroup && q.includes(normalizeText(skill.subgroup))) score += 4;

  return score;
}

function searchSkills(query, limit = 10) {
  const ranked = getAllSkills()
    .map((skill) => ({ skill, score: scoreSkill(skill, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.id.localeCompare(b.skill.id))
    .slice(0, limit);

  return ranked;
}

module.exports = {
  getAllSkills,
  getSkillById,
  searchSkills,
};
