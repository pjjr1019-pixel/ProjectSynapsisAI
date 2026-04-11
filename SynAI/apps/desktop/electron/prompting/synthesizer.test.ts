import { describe, expect, it } from "vitest";
import type { ChatMessage, PromptIntentContract } from "@contracts";
import { createSynthesisMessages } from "./synthesizer";

const promptIntent: PromptIntentContract = {
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
  missingEvidence: ["repo-evidence"],
  requiredChecks: ["respect-source-scope", "state-uncertainty-when-evidence-is-missing"]
};

describe("prompt intent synthesizer", () => {
  it("adds a prompt-intent system note before synthesis", () => {
    const promptMessages: ChatMessage[] = [
      {
        id: "system-context",
        conversationId: "c1",
        role: "system",
        content: "Base context",
        createdAt: "2026-04-11T10:00:00.000Z"
      }
    ];

    const result = createSynthesisMessages(promptMessages, promptIntent);

    expect(result).toHaveLength(2);
    expect(result[1].role).toBe("system");
    expect(result[1].content).toContain("Working prompt intent:");
    expect(result[1].content).toContain("Missing evidence: repo-evidence");
  });
});
