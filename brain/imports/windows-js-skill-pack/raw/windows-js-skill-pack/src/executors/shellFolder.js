const { spawn } = require("node:child_process");

function runShellFolder(target) {
  return new Promise((resolve, reject) => {
    const child = spawn("explorer.exe", [target], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: target, executor: "shellFolder" });
  });
}

module.exports = { runShellFolder };
