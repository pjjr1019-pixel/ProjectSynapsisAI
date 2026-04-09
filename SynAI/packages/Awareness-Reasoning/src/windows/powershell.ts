import { spawn, type ChildProcess, type SpawnOptionsWithoutStdio } from "node:child_process";

export const DEFAULT_POWERSHELL_TIMEOUT_MS = 10_000;
export const DEFAULT_POWERSHELL_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

type SpawnProcess = typeof spawn;

export interface RunPowerShellJsonOptions {
  timeoutMs?: number;
  maxBufferBytes?: number;
  platform?: NodeJS.Platform;
  spawnProcess?: SpawnProcess;
}

const POWERSHELL_ARGS = [
  "-NoProfile",
  "-NonInteractive",
  "-ExecutionPolicy",
  "Bypass",
  "-Command"
] as const;

const finishOnce = <T>(resolve: (value: T | null) => void) => {
  let settled = false;
  return (value: T | null) => {
    if (settled) {
      return;
    }
    settled = true;
    resolve(value);
  };
};

export const runPowerShellJson = async <T>(
  script: string,
  options: RunPowerShellJsonOptions = {}
): Promise<T | null> => {
  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    return null;
  }

  const timeoutMs = Math.max(250, options.timeoutMs ?? DEFAULT_POWERSHELL_TIMEOUT_MS);
  const maxBufferBytes = Math.max(1_024, options.maxBufferBytes ?? DEFAULT_POWERSHELL_MAX_BUFFER_BYTES);
  const spawnProcess = options.spawnProcess ?? spawn;

  return new Promise<T | null>((resolve) => {
    const finish = finishOnce<T>(resolve);
    const spawnOptions: SpawnOptionsWithoutStdio = {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    };

    let child: ChildProcess;
    try {
      child = spawnProcess("powershell.exe", [...POWERSHELL_ARGS, script], spawnOptions);
    } catch {
      finish(null);
      return;
    }

    let stdout = "";
    let stderr = "";
    let exceededBuffer = false;

    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    if (!stdoutStream || !stderrStream) {
      finish(null);
      return;
    }

    stdoutStream.setEncoding("utf8");
    stderrStream.setEncoding("utf8");

    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const enforceBufferLimit = () => {
      if (Buffer.byteLength(stdout, "utf8") + Buffer.byteLength(stderr, "utf8") <= maxBufferBytes) {
        return;
      }

      exceededBuffer = true;
      child.kill();
      clearTimer();
      finish(null);
    };

    stdoutStream.on("data", (chunk: string) => {
      stdout += chunk;
      enforceBufferLimit();
    });
    stderrStream.on("data", (chunk: string) => {
      stderr += chunk;
      enforceBufferLimit();
    });

    child.once("error", () => {
      clearTimer();
      finish(null);
    });

    child.once("close", (code) => {
      clearTimer();
      if (exceededBuffer || code !== 0) {
        finish(null);
        return;
      }

      const output = stdout.replace(/^\uFEFF/, "").trim();
      if (!output) {
        finish(null);
        return;
      }

      try {
        finish(JSON.parse(output) as T);
      } catch {
        finish(null);
      }
    });

    timer = setTimeout(() => {
      child.kill();
      finish(null);
    }, timeoutMs);
    timer.unref?.();
  });
};
