import { describe, expect, it } from "vitest";
import { createBackgroundTaskRunner } from "../src/bootstrap/task-runner";

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe("background task runner", () => {
  it("serializes queued heavy tasks and reports health", async () => {
    const runner = createBackgroundTaskRunner(() => new Date("2026-04-09T12:00:00.000Z"));
    const order: string[] = [];

    const first = runner.run("task:first", async () => {
      order.push("first:start");
      await delay(10);
      order.push("first:end");
      return "first";
    });
    const second = runner.run("task:second", async () => {
      order.push("second:start");
      order.push("second:end");
      return "second";
    });

    const midHealth = runner.getHealth();
    expect(midHealth.queueDepth).toBeGreaterThanOrEqual(1);

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");

    expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"]);

    const health = runner.getHealth();
    expect(health.status).toBe("idle");
    expect(health.queueDepth).toBe(0);
    expect(health.lastCompletedAt).toBe("2026-04-09T12:00:00.000Z");
    expect(health.recentDurationsMs["task:first"]).toBeGreaterThanOrEqual(0);
    expect(health.recentDurationsMs["task:second"]).toBeGreaterThanOrEqual(0);
  });
});
