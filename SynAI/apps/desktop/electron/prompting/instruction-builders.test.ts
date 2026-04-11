import { describe, expect, it } from "vitest";
import type { ChatMessage, ChatReplyPolicy, PromptIntentContract } from "@contracts";
import { applyPromptPolicies } from "./instruction-builders";

const replyPolicy: ChatReplyPolicy = {
  sourceScope: "repo-wide",
  formatPolicy: "preserve-exact-structure",
  groundingPolicy: "source-boundary",
  routingPolicy: "chat-first-source-scoped"
};

const promptIntent: PromptIntentContract = {
  intentFamily: "repo-grounded",
  userGoal: "Summarize the current repo behavior.",
  constraints: ["Use only repo evidence already in context."],
  sourceScope: "repo-wide",
  outputContract: {
    shape: "exact-user-structure",
    length: "short",
    preserveExactStructure: true
  },
  ambiguityFlags: ["format-sensitive"],
  missingEvidence: [],
  requiredChecks: ["respect-source-scope", "preserve-user-structure"]
};

describe("prompt instruction builders", () => {
  it("appends response, reply policy, and prompt intent guidance to the system message only", () => {
    const messages: ChatMessage[] = [
      {
        id: "system-context",
        conversationId: "c1",
        role: "system",
        content: "Base context",
        createdAt: "2026-04-11T10:00:00.000Z"
      },
      {
        id: "user-1",
        conversationId: "c1",
        role: "user",
        content: "Question",
        createdAt: "2026-04-11T10:00:01.000Z"
      }
    ];

    const result = applyPromptPolicies(
      messages,
      "smart",
      "evidence-first",
      "advanced",
      replyPolicy,
      promptIntent
    );

    expect(result[0].content).toContain("Reply style:");
    expect(result[0].content).toContain("Reply policy: source scope = repo-wide.");
    expect(result[0].content).toContain("Prompt intent:");
    expect(result[0].content).toContain("Summarize the current repo behavior.");
    expect(result[1].content).toBe("Question");
  });
});
