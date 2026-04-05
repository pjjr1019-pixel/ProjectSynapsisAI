const { spawn } = require("node:child_process");

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: command, args, executor: "command" });
  });
}

module.exports = { runCommand };
