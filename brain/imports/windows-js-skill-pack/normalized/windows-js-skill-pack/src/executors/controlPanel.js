const { spawn } = require("node:child_process");

function runControlPanel(canonicalName) {
  return new Promise((resolve, reject) => {
    const child = spawn("control.exe", ["/name", canonicalName], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });

    child.on("error", reject);
    child.unref();
    resolve({ ok: true, launched: canonicalName, executor: "controlPanel" });
  });
}

module.exports = { runControlPanel };
