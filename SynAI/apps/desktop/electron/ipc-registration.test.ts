import { describe, expect, it, vi } from "vitest";
import { createValidatedIpcHandleRegistry } from "./ipc-registration";

describe("createValidatedIpcHandleRegistry", () => {
  it("throws a clear error when a channel constant is missing", () => {
    const registerHandle = vi.fn();
    const registry = createValidatedIpcHandleRegistry({
      channelMap: {
        broken: undefined
      },
      registerHandle
    });

    expect(() =>
      registry.register("broken", async () => null)
    ).toThrowError("Missing IPC channel constant: broken");
    expect(registerHandle).not.toHaveBeenCalled();
  });

  it("throws before registering a duplicate channel", () => {
    const registerHandle = vi.fn();
    const registry = createValidatedIpcHandleRegistry({
      channelMap: {
        first: "channel:shared",
        second: "channel:shared"
      },
      registerHandle
    });

    registry.register("first", async () => "ok");

    expect(() =>
      registry.register("second", async () => "again")
    ).toThrowError("Duplicate IPC channel registration: channel:shared");
    expect(registerHandle).toHaveBeenCalledTimes(1);
  });

  it("allows re-registration after reset", () => {
    const registerHandle = vi.fn();
    const registry = createValidatedIpcHandleRegistry({
      channelMap: {
        first: "channel:one",
        second: "channel:one"
      },
      registerHandle
    });

    registry.register("first", async () => "ok");
    registry.reset();
    registry.register("second", async () => "ok");

    expect(registerHandle).toHaveBeenCalledTimes(2);
  });
});
