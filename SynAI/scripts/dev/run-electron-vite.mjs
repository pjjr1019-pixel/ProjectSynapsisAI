import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const cliPath = join(dirname(require.resolve("electron-vite/package.json")), "bin/electron-vite.js");
const command = process.execPath;
const args = [cliPath, ...process.argv.slice(2)];
const env = { ...process.env };

// Electron must run in browser-process mode; this flag forces node mode and removes app.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(command, args, {
  env,
  stdio: "inherit",
  windowsHide: true
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
