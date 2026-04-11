import { describe, expect, it, vi } from "vitest";
import type { ChatMessage, PromptIntentContract } from "@contracts";
import {
  createPromptIntentPlanningMessages,
  parsePromptIntentPlannerResponse,
  planPromptIntent
} from "./planner";

const seedPromptIntent: PromptIntentContract = {
  intentFamily: "repo-grounded",
  userGoal: "Summarize the repo behavior.",
  constraints: ["Use only repo evidence already in context."],
  sourceScope: "repo-wide",
  outputContract: {
    shape: "bullets",
    length: "short",
    preserveExactStructure: false
  },
  ambiguityFlags: [],
  missingEvidence: [],
  requiredChecks: ["respect-source-scope"]
};

const promptMessages: ChatMessage[] = [
  {
    id: "system-context",
    conversationId: "c1",
    role: "system",
    content: "Base context",
    createdAt: "2026-04-11T10:00:00.000Z"
  }
];

describe("prompt intent planner", () => {
  it("creates JSON planning messages and parses fenced planner output", async () => {
    const runPlanner = vi.fn(async () =>
      [
        "```json",
        JSON.stringify(
          {
            ...seedPromptIntent,
            userGoal: "Summarize the repo behavior in two short bullets.",
            outputContract: {
              shape: "bullets",
              length: "very-short",
              preserveExactStructure: false
            }
          },
          null,
          2
        ),
        "```"
      ].join("\n")
    );

    const messages = createPromptIntentPlanningMessages({
      promptMessages,
      query: "Summarize the repo behavior.",
      seedPromptIntent
    });
    expect(messages.at(-1)?.content).toContain("Seed intent:");

    const result = await planPromptIntent({
      promptMessages,
      query: "Summarize the repo behavior.",
      seedPromptIntent,
      runPlanner
    });

    expect(runPlanner).toHaveBeenCalledTimes(1);
    expect(result.userGoal).toBe("Summarize the repo behavior in two short bullets.");
    expect(result.outputContract.length).toBe("very-short");
  });

  it("falls back to the seed intent when the planner reply is invalid", () => {
    expect(parsePromptIntentPlannerResponse("not valid json", seedPromptIntent)).toEqual(seedPromptIntent);
  });
});
