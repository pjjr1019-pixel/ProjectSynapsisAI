"use strict";

const fs = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");
const process = require("node:process");

const PORTABLE_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.resolve(PORTABLE_ROOT, "config", "launcher-profile.json");
const DEFAULT_CONFIG = Object.freeze({
  mode: "dev",
  allowPortableFallback: true,
  devSourceRoot: "../taskmanager",
});

function ensureConfigDirectory() {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config) {
  ensureConfigDirectory();
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function isDirectory(value) {
  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function isFile(value) {
  try {
    return fs.statSync(value).isFile();
  } catch {
    return false;
  }
}

function hasDevShape(root) {
  if (!isDirectory(root)) return false;
  const packageJsonPath = path.resolve(root, "package.json");
  const desktopRunnerPath = path.resolve(root, "desktop", "run-electron-dev.cjs");
  const srcDir = path.resolve(root, "src");
  const viteConfigCandidates = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.cjs",
  ].map((file) => path.resolve(root, file));
  return (
    isFile(packageJsonPath) &&
    isFile(desktopRunnerPath) &&
    isDirectory(srcDir) &&
    viteConfigCandidates.some(isFile)
  );
}

function normalizeMode(mode) {
  const resolved = String(mode || "").trim().toLowerCase();
  return resolved === "portable" || resolved === "dev" || resolved === "auto"
    ? resolved
    : DEFAULT_CONFIG.mode;
}

function resolveMaybeRelative(root, value) {
  const input = String(value || "").trim();
  if (!input) return "";
  return path.isAbsolute(input) ? path.normalize(input) : path.resolve(root, input);
}

function resolveDevSourceRoot(config) {
  const candidates = [];
  const explicitFromConfig = resolveMaybeRelative(PORTABLE_ROOT, config.devSourceRoot);
  const explicitFromEnv = resolveMaybeRelative(PORTABLE_ROOT, process.env.HORIZONS_DEV_SOURCE_ROOT);
  const legacySibling = path.resolve(PORTABLE_ROOT, "..", "taskmanager");

  if (explicitFromConfig) candidates.push(explicitFromConfig);
  if (explicitFromEnv) candidates.push(explicitFromEnv);
  candidates.push(legacySibling);

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];
  for (const candidate of uniqueCandidates) {
    if (hasDevShape(candidate)) {
      return candidate;
    }
  }

  return explicitFromConfig || explicitFromEnv || legacySibling;
}

function describeCurrentState(config) {
  const devSourceRoot = resolveDevSourceRoot(config);
  return {
    config,
    portableRoot: PORTABLE_ROOT,
    devSourceRoot,
    devSourceAvailable: hasDevShape(devSourceRoot),
    configPath: CONFIG_PATH,
  };
}

function spawnForeground(file, args, cwd, env) {
  const child = spawn(file, args, {
    cwd,
    env,
    stdio: "inherit",
    windowsHide: false,
  });

  child.once("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.once("error", (error) => {
    console.error(`[launcher] Failed to start ${file}: ${error.message}`);
    process.exit(1);
  });
}

function spawnOptionalBackgroundNode(scriptPath, cwd, env) {
  if (!isFile(scriptPath)) return;
  const child = spawn(process.execPath, [scriptPath], {
    cwd,
    env,
    stdio: "ignore",
    windowsHide: true,
    detached: false,
  });
  child.unref();
}

function buildPortableEnv() {
  const env = {
    ...process.env,
    HORIZONS_TASKMANAGER_ROOT: PORTABLE_ROOT,
    HORIZONS_PORTABLE_MODE: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function launchPortable(config, reason = "") {
  const electronExe = path.resolve(PORTABLE_ROOT, "node_modules", "electron", "dist", "electron.exe");
  const mainEntry = path.resolve(PORTABLE_ROOT, "desktop", "main.cjs");
  const uiEntry = path.resolve(PORTABLE_ROOT, "dist", "index.html");

  if (!isFile(electronExe)) {
    console.error(`[launcher] Portable runtime is missing Electron at ${electronExe}`);
    process.exit(1);
  }
  if (!isFile(mainEntry)) {
    console.error(`[launcher] Portable runtime is missing ${mainEntry}`);
    process.exit(1);
  }
  if (!isFile(uiEntry)) {
    console.error(`[launcher] Portable runtime is missing ${uiEntry}`);
    process.exit(1);
  }

  if (reason) {
    console.log(`[launcher] ${reason}`);
  }
  console.log("[launcher] Launching portable runtime.");
  spawnForeground(electronExe, ["."], PORTABLE_ROOT, buildPortableEnv(config));
}

function launchDev(config) {
  const devSourceRoot = resolveDevSourceRoot(config);
  if (!hasDevShape(devSourceRoot)) {
    if (config.allowPortableFallback !== false) {
      launchPortable(
        config,
        `Dev mode was requested, but no source checkout was found at ${devSourceRoot}. Falling back to portable mode.`
      );
      return;
    }
    console.error(`[launcher] Dev mode was requested, but no source checkout was found at ${devSourceRoot}`);
    process.exit(1);
  }

  const runnerPath = path.resolve(devSourceRoot, "desktop", "run-electron-dev.cjs");
  const startupSyncPath = path.resolve(devSourceRoot, "..", "tools", "brain-startup", "startup-sync.js");
  const env = {
    ...process.env,
    HORIZONS_DEV_SOURCE_ROOT: devSourceRoot,
  };
  delete env.HORIZONS_PORTABLE_MODE;
  delete env.ELECTRON_RUN_AS_NODE;

  console.log(`[launcher] Launching dev source checkout at ${devSourceRoot}`);
  spawnOptionalBackgroundNode(startupSyncPath, path.resolve(devSourceRoot, ".."), env);
  spawnForeground(process.execPath, [runnerPath], devSourceRoot, env);
}

function printConfig() {
  const state = describeCurrentState(readConfig());
  process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
}

function setMode(nextMode) {
  const config = readConfig();
  config.mode = normalizeMode(nextMode);
  writeConfig(config);
  console.log(`[launcher] Launch mode set to ${config.mode}`);
}

function setDevRoot(nextRoot) {
  const config = readConfig();
  config.devSourceRoot = String(nextRoot || "").trim() || DEFAULT_CONFIG.devSourceRoot;
  writeConfig(config);
  console.log(`[launcher] Dev source root set to ${config.devSourceRoot}`);
}

function launchResolvedMode(modeOverride = "") {
  const config = readConfig();
  const effectiveMode = normalizeMode(modeOverride || config.mode);
  if (effectiveMode === "portable") {
    launchPortable(config);
    return;
  }
  if (effectiveMode === "dev") {
    launchDev(config);
    return;
  }

  const devSourceRoot = resolveDevSourceRoot(config);
  if (hasDevShape(devSourceRoot)) {
    launchDev(config);
    return;
  }
  launchPortable(config, `Auto mode did not find a usable dev checkout at ${devSourceRoot}.`);
}

function main(argv) {
  if (argv.includes("--print-config")) {
    printConfig();
    return;
  }

  const setModeIndex = argv.indexOf("--set-mode");
  if (setModeIndex >= 0) {
    setMode(argv[setModeIndex + 1] || "");
    return;
  }

  const setDevRootIndex = argv.indexOf("--set-dev-root");
  if (setDevRootIndex >= 0) {
    setDevRoot(argv[setDevRootIndex + 1] || "");
    return;
  }

  const modeIndex = argv.indexOf("--mode");
  const modeOverride = modeIndex >= 0 ? argv[modeIndex + 1] || "" : "";
  launchResolvedMode(modeOverride);
}

main(process.argv.slice(2));
