#!/usr/bin/env node
const { getAllSkills, searchSkills, resolveSkill, runSkill } = require("./index");

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log([
      "Usage:",
      "  node src/cli.js list",
      "  node src/cli.js search \"bluetooth settings\"",
      "  node src/cli.js open \"bluetooth settings\"",
      "  node src/cli.js open-id settings.devices.bluetooth",
      "  node src/cli.js doctor",
    ].join("\n"));
    return;
  }

  if (command === "list") {
    printJson(getAllSkills());
    return;
  }

  if (command === "search") {
    const query = rest.join(" ").trim();
    if (!query) throw new Error("Missing search query.");
    printJson(searchSkills(query));
    return;
  }

  if (command === "open") {
    const query = rest.join(" ").trim();
    if (!query) throw new Error("Missing open query.");
    const result = resolveSkill(query);
    if (!result.ok) throw new Error(result.error);
    const launch = await runSkill(result.skill);
    printJson({ result, launch });
    return;
  }

  if (command === "open-id") {
    const skillId = rest.join(" ").trim();
    if (!skillId) throw new Error("Missing skill id.");
    const result = resolveSkill(skillId);
    if (!result.ok) throw new Error(result.error);
    const launch = await runSkill(result.skill);
    printJson({ result, launch });
    return;
  }

  if (command === "doctor") {
    const skills = getAllSkills();
    const ids = new Set();
    const duplicates = [];
    for (const skill of skills) {
      if (ids.has(skill.id)) duplicates.push(skill.id);
      ids.add(skill.id);
    }
    printJson({
      ok: duplicates.length === 0,
      totalSkills: skills.length,
      duplicateIds: duplicates,
      groups: [...new Set(skills.map((s) => s.group))].sort(),
      executors: [...new Set(skills.map((s) => s.executor))].sort(),
    });
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
