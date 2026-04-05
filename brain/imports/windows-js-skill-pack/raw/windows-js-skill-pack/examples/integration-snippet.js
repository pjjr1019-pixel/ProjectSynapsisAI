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
