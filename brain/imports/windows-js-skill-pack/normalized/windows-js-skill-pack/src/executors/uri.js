const { spawn } = require("node:child_process");

function runUri(target) {
  return new Promise((resolve, reject) => {
    const child = spawn("cmd", ["/c", "start", "", target], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: target, executor: "uri" });
  });
}

module.exports = { runUri };
