const fs = require("node:fs");
const path = require("node:path");
const settingsSkills = require("./data/settingsSkills");
const controlPanelSkills = require("./data/controlPanelSkills");
const toolSkills = require("./data/toolSkills");
const folderSkills = require("./data/folderSkills");

const skills = [
  ...settingsSkills,
  ...controlPanelSkills,
  ...toolSkills,
  ...folderSkills,
];

const counts = {
  total: skills.length,
  settings: settingsSkills.length,
  controlpanel: controlPanelSkills.length,
  tool: toolSkills.length,
  folder: folderSkills.length,
};

const payload = {
  name: "windows-js-skill-pack",
  version: "0.1.0",
  counts,
  skills,
};

const outputPath = path.resolve(__dirname, "..", "INDEX.json");
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`Wrote ${outputPath}`);
