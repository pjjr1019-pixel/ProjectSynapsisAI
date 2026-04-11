import { describe, expect, it } from "vitest";
import { deriveReplyPolicy, deriveRoutingSuppressionReasons } from "./policy-matrix";
import { classifyPromptTask } from "./task-classifier";

describe("policy matrix", () => {
  it("prefers explicit repo scope over awareness and time-sensitive signals", () => {
    const classification = classifyPromptTask(
      "Using the current repo docs only, explain the Windows CPU routing today in exactly 2 bullets."
    );

    const policy = deriveReplyPolicy(classification);

    expect(policy).toEqual({
      sourceScope: "docs-only",
      formatPolicy: "preserve-exact-structure",
      groundingPolicy: "source-boundary",
      routingPolicy: "chat-first-source-scoped"
    });
    expect(deriveRoutingSuppressionReasons(classification, policy)).toEqual(
      expect.arrayContaining([
        "docs-only scope suppresses awareness routing",
        "explicit repo scope suppresses live time-sensitive routing"
      ])
    );
  });

  it("routes explicit local state prompts to awareness-only", () => {
    const classification = classifyPromptTask("What is using the most RAM right now?");

    expect(deriveReplyPolicy(classification)).toEqual({
      sourceScope: "awareness-only",
      formatPolicy: "default",
      groundingPolicy: "awareness-direct",
      routingPolicy: "windows-explicit-only"
    });
  });

  it("routes time-sensitive prompts to live scope when no repo boundary is requested", () => {
    const classification = classifyPromptTask(
      "What is the latest Windows release-health guidance today?"
    );

    expect(deriveReplyPolicy(classification).sourceScope).toBe("time-sensitive-live");
  });

  it("keeps explicit overrides as the highest-priority rule", () => {
    const classification = classifyPromptTask("What is my CPU usage right now?");

    expect(
      deriveReplyPolicy(classification, {
        overrides: {
          sourceScope: "repo-wide",
          routingPolicy: "chat-first-source-scoped"
        }
      })
    ).toEqual({
      sourceScope: "repo-wide",
      formatPolicy: "default",
      groundingPolicy: "source-boundary",
      routingPolicy: "chat-first-source-scoped"
    });
  });
});
