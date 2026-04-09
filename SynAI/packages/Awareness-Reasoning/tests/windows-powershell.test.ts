import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runPowerShellJson } from "../src/windows/powershell";

type FakeChildProcess = EventEmitter & {
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
};

const createFakeChildProcess = (): FakeChildProcess => {
  const child = new EventEmitter() as FakeChildProcess;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => {
    child.emit("close", null);
    return true;
  });
  return child;
};

describe("windows powershell runner", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("parses successful json output asynchronously", async () => {
    const child = createFakeChildProcess();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.end('{"machine":"test-machine"}');
        child.emit("close", 0);
      });
      return child as never;
    });

    await expect(
      runPowerShellJson<{ machine: string }>("Write-Output", {
        platform: "win32",
        spawnProcess
      })
    ).resolves.toEqual({ machine: "test-machine" });
    expect(spawnProcess).toHaveBeenCalledWith(
      "powershell.exe",
      expect.arrayContaining(["-NoProfile", "-Command", "Write-Output"]),
      expect.objectContaining({
        windowsHide: true
      })
    );
  });

  it("returns null when the powershell command times out", async () => {
    vi.useFakeTimers();
    const child = createFakeChildProcess();
    const promise = runPowerShellJson("Get-Process", {
      platform: "win32",
      timeoutMs: 300,
      spawnProcess: vi.fn(() => child as never)
    });

    await vi.advanceTimersByTimeAsync(350);
    await expect(promise).resolves.toBeNull();
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it("returns null when powershell exits with a non-zero code", async () => {
    const child = createFakeChildProcess();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stderr.end("boom");
        child.emit("close", 1);
      });
      return child as never;
    });

    await expect(
      runPowerShellJson("Get-Process", {
        platform: "win32",
        spawnProcess
      })
    ).resolves.toBeNull();
  });

  it("returns null when powershell output is malformed json", async () => {
    const child = createFakeChildProcess();
    const spawnProcess = vi.fn(() => {
      queueMicrotask(() => {
        child.stdout.end("{not-json}");
        child.emit("close", 0);
      });
      return child as never;
    });

    await expect(
      runPowerShellJson("Get-Process", {
        platform: "win32",
        spawnProcess
      })
    ).resolves.toBeNull();
  });
});
