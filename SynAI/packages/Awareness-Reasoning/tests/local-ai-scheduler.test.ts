import { describe, expect, it, beforeEach } from "vitest";
import {
  getLocalAISchedulerStatus,
  resetLocalAISchedulerState,
  resolveScheduledLocalAISelection,
  withScheduledLocalAITask
} from "../src/local-ai/scheduler";

describe("local ai scheduler", () => {
  beforeEach(() => {
    resetLocalAISchedulerState();
    process.env.OLLAMA_CODE_MODEL = "code-model";
  });

  it("prefers the code model for code tasks on constrained hardware", () => {
    const selection = resolveScheduledLocalAISelection(
      {
        baseUrl: "http://127.0.0.1:11434",
        model: "general-model",
        embedModel: "embed-model"
      },
      {
        taskClass: "code",
        codingMode: true,
        highQualityMode: true
      }
    );

    expect(selection.summary.taskClass).toBe("code");
    expect(selection.summary.model).toBe("code-model");
    expect(selection.summary.keepAliveMs).toBeGreaterThan(0);
  });

  it("records load and reuse events and keeps one active model slot", async () => {
    const first = resolveScheduledLocalAISelection(
      {
        baseUrl: "http://127.0.0.1:11434",
        model: "general-model",
        embedModel: "embed-model"
      },
      {
        taskClass: "general",
        reason: "first request"
      }
    );

    await withScheduledLocalAITask(first, async () => "ok");
    const second = resolveScheduledLocalAISelection(
      {
        baseUrl: "http://127.0.0.1:11434",
        model: "general-model",
        embedModel: "embed-model"
      },
      {
        taskClass: "general",
        reason: "second request"
      }
    );

    await withScheduledLocalAITask(second, async () => "ok");
    const status = getLocalAISchedulerStatus();

    expect(status.activeModel).toBe("general-model");
    expect(status.loadedModels).toEqual(["general-model"]);
    expect(status.recentEvents.some((event) => event.kind === "load")).toBe(true);
    expect(status.recentEvents.some((event) => event.kind === "reuse")).toBe(true);
  });
});
