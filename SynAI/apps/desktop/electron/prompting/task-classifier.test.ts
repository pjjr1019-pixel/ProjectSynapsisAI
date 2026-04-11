import { describe, expect, it } from "vitest";
import { classifyPromptTask } from "./task-classifier";

describe("task classifier", () => {
  it("detects repo grounding, exact formatting, and time-sensitive signals together", () => {
    const result = classifyPromptTask(
      "Using the current SynAI README, explain how time-sensitive prompts are handled. Answer in exactly 3 short bullets labeled Trigger, Action, and Surfacing."
    );

    expect(result.repoGroundingSubtype).toBe("readme-only");
    expect(result.categories.repo_grounded).toBe(true);
    expect(result.categories.exact_format).toBe(true);
    expect(result.categories.time_sensitive).toBe(true);
    expect(result.rawSignals).toEqual(
      expect.arrayContaining(["scope:readme-only", "format:exact-structure", "time:live-request"])
    );
  });

  it("keeps fallback heuristic markers while classifying explicit Windows prompts", () => {
    const result = classifyPromptTask("What is my CPU usage right now?");

    expect(result.categories.awareness_local_state).toBe(true);
    expect(result.categories.time_sensitive).toBe(true);
    expect(result.fallbackSignals).toContain("fallback:time-sensitive-pattern");
    expect(result.rawSignals).toContain("awareness:windows-keyword");
  });

  it("identifies generic-writing and first-time decomposition prompts deterministically", () => {
    const genericWriting = classifyPromptTask(
      "Rewrite this reply to sound calmer without changing its meaning."
    );
    const firstTimeTask = classifyPromptTask(
      "I am using SynAI for the first time. Walk me through how to inspect a repo change safely."
    );

    expect(genericWriting.categories.generic_writing).toBe(true);
    expect(firstTimeTask.categories.first_time_task).toBe(true);
    expect(firstTimeTask.categories.repo_grounded).toBe(true);
  });

  it("uses awareness route hints when the prompt itself is indirect", () => {
    const result = classifyPromptTask("What changed with this setting?", {
      route: {
        family: "settings-control-panel",
        confidence: 0.62,
        signals: ["windows-settings"]
      }
    });

    expect(result.categories.awareness_local_state).toBe(true);
    expect(result.rawSignals).toContain("awareness:route:settings-control-panel");
  });
});
