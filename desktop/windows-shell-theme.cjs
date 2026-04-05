"use strict";

const fs = require("node:fs/promises");
const { dirname, resolve } = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const DEFAULT_SNAPSHOT_PATH = resolve(__dirname, "../.runtime/windows-shell-theme-state.json");

const REGISTRY_VALUE_DEFINITIONS = [
  {
    id: "colorizationColor",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\DWM",
    valueName: "ColorizationColor",
    type: "REG_DWORD",
  },
  {
    id: "dwmColorPrevalence",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\DWM",
    valueName: "ColorPrevalence",
    type: "REG_DWORD",
  },
  {
    id: "colorPrevalence",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
    valueName: "ColorPrevalence",
    type: "REG_DWORD",
  },
  {
    id: "systemUsesLightTheme",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
    valueName: "SystemUsesLightTheme",
    type: "REG_DWORD",
  },
  {
    id: "appsUseLightTheme",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
    valueName: "AppsUseLightTheme",
    type: "REG_DWORD",
  },
  {
    id: "accentColorMenu",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
    valueName: "AccentColorMenu",
    type: "REG_DWORD",
  },
  {
    id: "startColorMenu",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
    valueName: "StartColorMenu",
    type: "REG_DWORD",
  },
  {
    id: "accentPalette",
    keyPath: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
    valueName: "AccentPalette",
    type: "REG_BINARY",
  },
];

const SHELL_THEME_MODE_VALUES = {
  dark: {
    ColorizationColor: "0xff27355a",
    ColorPrevalence: "0x1",
    SystemUsesLightTheme: "0x0",
    AppsUseLightTheme: "0x0",
    AccentColorMenu: "0xff1a2236",
    StartColorMenu: "0xff0f141f",
    AccentPalette: "2B3D6A0024345A001E2C4D0018243F00131C32000F1627000B101B00070A1100",
  },
  light: {
    ColorizationColor: "0xff0078d4",
    ColorPrevalence: "0x1",
    SystemUsesLightTheme: "0x1",
    AppsUseLightTheme: "0x1",
    AccentColorMenu: "0xffd9e9fb",
    StartColorMenu: "0xffeef5fd",
    AccentPalette: "F5FAFF00E4F0FF00C4DEFF009DCAFF000078D400006CBD00005A9E0012457900",
  },
};

function defaultRunCommand(command, args) {
  return execFileAsync(command, args, { windowsHide: true });
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseRegistryQueryOutput(stdout, valueName) {
  const pattern = new RegExp(`^\\s*${escapeRegex(valueName)}\\s+(REG_\\w+)\\s+(.+?)\\s*$`, "im");
  const match = pattern.exec(String(stdout || ""));
  if (!match) return null;
  return {
    type: match[1],
    value: match[2].trim(),
  };
}

function isMissingRegistryValueError(error) {
  const combined = [
    error?.stdout,
    error?.stderr,
    error?.message,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return combined.includes("unable to find") || combined.includes("cannot find");
}

function buildSnapshotPayload(values) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    values,
  };
}

function createWindowsShellThemeManager(options = {}) {
  const platform = options.platform ?? process.platform;
  const snapshotPath = options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const fileSystem = options.fs ?? fs;

  let prepared = false;
  let originalSnapshot = null;
  let lastAppliedMode = null;
  let restorePromise = null;

  async function queryRegistryValue(definition) {
    try {
      const result = await runCommand("reg.exe", ["query", definition.keyPath, "/v", definition.valueName]);
      const parsed = parseRegistryQueryOutput(result?.stdout, definition.valueName);
      if (!parsed) {
        throw new Error(`Unable to parse registry output for ${definition.keyPath} :: ${definition.valueName}`);
      }
      return {
        exists: true,
        type: parsed.type || definition.type,
        value: parsed.value,
      };
    } catch (error) {
      if (isMissingRegistryValueError(error)) {
        return {
          exists: false,
          type: definition.type,
          value: null,
        };
      }
      throw error;
    }
  }

  async function writeRegistryValue(definition, value) {
    await runCommand("reg.exe", [
      "add",
      definition.keyPath,
      "/v",
      definition.valueName,
      "/t",
      definition.type,
      "/d",
      String(value),
      "/f",
    ]);
  }

  async function deleteRegistryValue(definition) {
    try {
      await runCommand("reg.exe", [
        "delete",
        definition.keyPath,
        "/v",
        definition.valueName,
        "/f",
      ]);
    } catch (error) {
      if (!isMissingRegistryValueError(error)) {
        throw error;
      }
    }
  }

  async function refreshShellAppearance() {
    try {
      await runCommand("RUNDLL32.EXE", ["user32.dll,UpdatePerUserSystemParameters"]);
    } catch {
      // Best effort only. Windows applies many theme changes lazily anyway.
    }

    try {
      await runCommand("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-Command",
        "Add-Type -TypeDefinition @'\nusing System;\nusing System.Runtime.InteropServices;\npublic static class NativeThemeBridge {\n  [DllImport(\"user32.dll\", CharSet = CharSet.Unicode, SetLastError = true)]\n  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);\n}\n'@; $result = [UIntPtr]::Zero; [void][NativeThemeBridge]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, 'ImmersiveColorSet', 2, 200, [ref]$result); [void][NativeThemeBridge]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, 'WindowsThemeElement', 2, 200, [ref]$result);",
      ]);
    } catch {
      // Best effort only.
    }
  }

  async function captureCurrentSnapshot() {
    const values = {};
    for (const definition of REGISTRY_VALUE_DEFINITIONS) {
      values[definition.id] = await queryRegistryValue(definition);
    }
    return buildSnapshotPayload(values);
  }

  async function ensureSnapshotDirectory() {
    await fileSystem.mkdir(dirname(snapshotPath), { recursive: true });
  }

  async function persistSnapshot(snapshot) {
    await ensureSnapshotDirectory();
    await fileSystem.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
  }

  async function loadPersistedSnapshot() {
    try {
      const raw = await fileSystem.readFile(snapshotPath, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.values || typeof parsed.values !== "object") {
        return null;
      }
      return parsed;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async function deletePersistedSnapshot() {
    try {
      await fileSystem.unlink(snapshotPath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  async function restoreSnapshot(snapshot) {
    const values = snapshot?.values;
    if (!values || typeof values !== "object") return false;

    for (const definition of REGISTRY_VALUE_DEFINITIONS) {
      const stored = values[definition.id];
      if (!stored || typeof stored !== "object" || stored.exists === false) {
        await deleteRegistryValue(definition);
        continue;
      }
      await writeRegistryValue(definition, stored.value);
    }

    await refreshShellAppearance();
    return true;
  }

  async function prepareForAppSession() {
    if (platform !== "win32") return false;
    if (prepared) return true;

    const staleSnapshot = await loadPersistedSnapshot();
    if (staleSnapshot) {
      await restoreSnapshot(staleSnapshot);
      await deletePersistedSnapshot();
    }

    originalSnapshot = await captureCurrentSnapshot();
    await persistSnapshot(originalSnapshot);
    prepared = true;
    lastAppliedMode = null;
    return true;
  }

  async function applyMode(mode) {
    if (platform !== "win32") return false;
    const resolvedMode = mode === "light" ? "light" : "dark";
    await prepareForAppSession();
    if (lastAppliedMode === resolvedMode) return false;

    const values = SHELL_THEME_MODE_VALUES[resolvedMode];
    for (const definition of REGISTRY_VALUE_DEFINITIONS) {
      await writeRegistryValue(definition, values[definition.valueName]);
    }

    await refreshShellAppearance();
    lastAppliedMode = resolvedMode;
    return true;
  }

  async function restoreOriginalState() {
    if (platform !== "win32") return false;
    if (restorePromise) return restorePromise;

    restorePromise = (async () => {
      const snapshot = originalSnapshot ?? await loadPersistedSnapshot();
      if (!snapshot) {
        lastAppliedMode = null;
        prepared = false;
        return false;
      }

      await restoreSnapshot(snapshot);
      await deletePersistedSnapshot();
      lastAppliedMode = null;
      prepared = false;
      return true;
    })().finally(() => {
      restorePromise = null;
    });

    return restorePromise;
  }

  return {
    prepareForAppSession,
    applyMode,
    restoreOriginalState,
  };
}

module.exports = {
  createWindowsShellThemeManager,
  REGISTRY_VALUE_DEFINITIONS,
  SHELL_THEME_MODE_VALUES,
  __private: {
    buildSnapshotPayload,
    isMissingRegistryValueError,
    parseRegistryQueryOutput,
  },
};
