const { runUri } = require("./executors/uri");
const { runControlPanel } = require("./executors/controlPanel");
const { runCommand } = require("./executors/command");
const { runShellFolder } = require("./executors/shellFolder");

async function runSkill(skill) {
  if (!skill || !skill.executor) {
    throw new Error("Invalid skill.");
  }

  switch (skill.executor) {
    case "uri":
      return runUri(skill.target);
    case "controlPanel":
      return runControlPanel(skill.target);
    case "command":
      return runCommand(skill.command || skill.target, skill.args || []);
    case "shellFolder":
      return runShellFolder(skill.target);
    default:
      throw new Error(`Unsupported executor: ${skill.executor}`);
  }
}

module.exports = {
  runSkill,
};
