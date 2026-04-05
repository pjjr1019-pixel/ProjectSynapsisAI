const { spawn } = require("node:child_process");
const path = require("node:path");
const process = require("node:process");

const electronBinary = require("electron");
const taskmanagerRoot = path.resolve(__dirname, "..");
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ["."], {
  cwd: taskmanagerRoot,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: false,
});

child.stdout?.pipe(process.stdout);
child.stderr?.pipe(process.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});