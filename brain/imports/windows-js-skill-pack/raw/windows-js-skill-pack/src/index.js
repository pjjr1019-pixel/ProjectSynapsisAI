const { getAllSkills, getSkillById, searchSkills } = require("./skillRegistry");
const { resolveSkill } = require("./router");
const { runSkill } = require("./runner");

module.exports = {
  getAllSkills,
  getSkillById,
  searchSkills,
  resolveSkill,
  runSkill,
};
