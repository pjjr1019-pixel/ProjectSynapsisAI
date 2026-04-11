import { describe, expect, it } from "vitest";
import { IPC_CHANNELS } from "@contracts";

const capabilityRunnerChannelKeys = [
  "capabilityRunnerCatalog",
  "capabilityRunnerRuns",
  "capabilityRunnerSnapshot",
  "capabilityRunnerStart",
  "capabilityRunnerPause",
  "capabilityRunnerResume",
  "capabilityRunnerStop",
  "capabilityRunnerRerunFailed",
  "capabilityRunnerExport",
  "capabilityRunnerEvents"
] as const;

describe("IPC channel contracts", () => {
  it("keeps capability-runner channels defined and unique", () => {
    const channels = capabilityRunnerChannelKeys.map((key) => {
      const value = IPC_CHANNELS[key];
      expect(typeof value).toBe("string");
      expect(value?.trim().length).toBeGreaterThan(0);
      return value;
    });

    expect(new Set(channels).size).toBe(channels.length);
  });
});
