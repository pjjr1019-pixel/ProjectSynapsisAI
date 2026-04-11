import { describe, expect, it } from "vitest";
import type { ChatReplyPolicy } from "@contracts";
import {
  buildSeedPromptIntent,
  isExplicitWindowsAwarenessPrompt,
  isGenericWritingPrompt,
  shouldPreferOfficialWindowsKnowledge
} from "./intent-contract";
import { classifyPromptTask } from "./task-classifier";

const repoPolicy: ChatReplyPolicy = {
  sourceScope: "repo-wide",
  formatPolicy: "default",
  groundingPolicy: "source-boundary",
  routingPolicy: "chat-first-source-scoped"
};

describe("prompt intent contract generation", () => {
  it("builds a repo-grounded intent with missing evidence checks when workspace evidence is absent", () => {
    const intent = buildSeedPromptIntent({
      query: "Summarize the current repo behavior in short bullets.",
      route: {
        family: "repo-change",
        label: "Repo change",
        confidence: 0.72,
        signals: ["repo"],
        targetAreas: []
      },
      replyPolicy: repoPolicy,
      responseMode: "smart",
      reasoningMode: "advanced",
      taskClassification: classifyPromptTask("Summarize the current repo behavior in short bullets."),
      hasWorkspaceHits: false,
      hasAwarenessEvidence: false,
      hasLiveWebResults: false,
      useWebSearch: false,
      preferOfficialWindowsKnowledge: false
    });

    expect(intent.intentFamily).toBe("repo-change");
    expect(intent.sourceScope).toBe("repo-wide");
    expect(intent.outputContract.shape).toBe("bullets");
    expect(intent.missingEvidence).toContain("repo-evidence");
    expect(intent.requiredChecks).toEqual(
      expect.arrayContaining(["respect-source-scope", "avoid-awareness-routing"])
    );
  });

  it("adds decomposition-oriented checks for first-time prompts", () => {
    const intent = buildSeedPromptIntent({
      query: "I am using SynAI for the first time. Walk me through how to inspect a repo change safely.",
      route: {
        family: "repo-change",
        label: "Repo change",
        confidence: 0.61,
        signals: ["repo"],
        targetAreas: []
      },
      replyPolicy: repoPolicy,
      responseMode: "smart",
      reasoningMode: "advanced",
      taskClassification: classifyPromptTask(
        "I am using SynAI for the first time. Walk me through how to inspect a repo change safely."
      ),
      hasWorkspaceHits: true,
      hasAwarenessEvidence: false,
      hasLiveWebResults: false,
      useWebSearch: false,
      preferOfficialWindowsKnowledge: false
    });

    expect(intent.requiredChecks).toEqual(
      expect.arrayContaining(["decompose-first-time-task"])
    );
  });

  it("captures simple human style preferences in constraints", () => {
    const intent = buildSeedPromptIntent({
      query: "Keep replies simple, easy to read, and more human.",
      route: null,
      replyPolicy: {
        sourceScope: "workspace-only",
        formatPolicy: "default",
        groundingPolicy: "default",
        routingPolicy: "default"
      },
      responseMode: "fast",
      reasoningMode: "fast",
      taskClassification: classifyPromptTask("Keep replies simple, easy to read, and more human."),
      hasWorkspaceHits: false,
      hasAwarenessEvidence: false,
      hasLiveWebResults: false,
      useWebSearch: false,
      preferOfficialWindowsKnowledge: false
    });

    expect(intent.constraints.some((entry) => entry.toLowerCase().includes("simple"))).toBe(true);
    expect(intent.constraints.some((entry) => entry.toLowerCase().includes("human"))).toBe(true);
  });

  it("detects generic writing prompts and explicit Windows prompts", () => {
    expect(isGenericWritingPrompt("Rewrite this reply to sound calmer without changing its meaning.")).toBe(true);
    expect(
      isExplicitWindowsAwarenessPrompt("What is using the most RAM on Windows right now?", {
        family: "resource-hotspot",
        label: "Resource hotspot",
        confidence: 0.6,
        signals: ["ram"],
        targetAreas: []
      })
    ).toBe(true);
    expect(
      shouldPreferOfficialWindowsKnowledge("Open Control Panel and explain the setting.", {
        family: "settings-control-panel",
        label: "Control Panel",
        confidence: 0.7,
        signals: ["control panel"],
        targetAreas: []
      })
    ).toBe(true);
  });
});
