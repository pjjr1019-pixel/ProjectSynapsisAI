import { spawn } from "node:child_process";
export const DEFAULT_POWERSHELL_TIMEOUT_MS = 10_000;
export const DEFAULT_POWERSHELL_MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const POWERSHELL_ARGS = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command"
];
const finishOnce = (resolve) => {
    let settled = false;
    return (value) => {
        if (settled) {
            return;
        }
        settled = true;
        resolve(value);
    };
};
export const runPowerShellJson = async (script, options = {}) => {
    const platform = options.platform ?? process.platform;
    if (platform !== "win32") {
        return null;
    }
    const timeoutMs = Math.max(250, options.timeoutMs ?? DEFAULT_POWERSHELL_TIMEOUT_MS);
    const maxBufferBytes = Math.max(1_024, options.maxBufferBytes ?? DEFAULT_POWERSHELL_MAX_BUFFER_BYTES);
    const spawnProcess = options.spawnProcess ?? spawn;
    return new Promise((resolve) => {
        const finish = finishOnce(resolve);
        const spawnOptions = {
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"]
        };
        let child;
        try {
            child = spawnProcess("powershell.exe", [...POWERSHELL_ARGS, script], spawnOptions);
        }
        catch {
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
        let timer = null;
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
        stdoutStream.on("data", (chunk) => {
            stdout += chunk;
            enforceBufferLimit();
        });
        stderrStream.on("data", (chunk) => {
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
                finish(JSON.parse(output));
            }
            catch {
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
