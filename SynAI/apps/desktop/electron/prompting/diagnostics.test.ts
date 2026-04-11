import { describe, expect, it } from "vitest";
import type {
  ChatReplyPolicy,
  ChatReplyPolicyDiagnostics,
  PromptIntentContract
} from "@contracts";
import {
  buildChatExecutionDiagnostics,
  buildRetrievedSourceSummary
} from "./diagnostics";

const replyPolicy: ChatReplyPolicy = {
  sourceScope: "repo-wide",
  formatPolicy: "default",
  groundingPolicy: "source-boundary",
  routingPolicy: "chat-first-source-scoped"
};

const policyDiagnostics: ChatReplyPolicyDiagnostics = {
  rawSignals: ["scope:repo-wide", "format:exact-structure"],
  fallbackSignals: ["fallback:repo-wide-pattern"],
  classifier: {
    categories: {
      repo_grounded: true,
      exact_format: true,
      awareness_local_state: false,
      time_sensitive: false,
      governed_action: false,
      generic_writing: false,
      first_time_task: false,
      open_ended: false
    },
    repoGroundingSubtype: "repo-wide"
  },
  chosenPolicy: replyPolicy,
  suppressionReasons: ["repo-grounded scope suppresses awareness routing"]
};

const promptIntent: PromptIntentContract = {
  intentFamily: "repo-grounded",
  userGoal: "Summarize the repo behavior.",
  constraints: [],
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

describe("prompting diagnostics", () => {
  it("builds retrieved source summaries and execution diagnostics with prompt intent", () => {
    const retrievedSourceSummary = buildRetrievedSourceSummary({
      memoryCount: 1,
      workspaceHitCount: 2,
      workspacePaths: ["SynAI/README.md"],
      awarenessSourceCount: 0,
      webResultCount: 0
    });

    const diagnostics = buildChatExecutionDiagnostics({
      intentRoute: {
        family: "repo-change",
        label: "Repo change",
        confidence: 0.62,
        signals: ["repo"],
        targetAreas: []
      },
      rawIntentRoute: {
        family: "repo-change",
        label: "Repo change",
        confidence: 0.62,
        signals: ["repo"],
        targetAreas: []
      },
      awarenessUsed: false,
      deterministicAwareness: false,
      genericWritingPromptSuppressed: false,
      replyPolicy,
      policyDiagnostics,
      cleanupBypassed: false,
      routingSuppressionReason: null,
      retrievedSourceSummary,
      reasoningMode: "advanced",
      evaluationSuiteMode: "chat-only",
      promptIntent
    });

    expect(diagnostics.routeFamily).toBe("repo-change");
    expect(diagnostics.retrievedSourceSummary?.workspacePaths).toEqual(["SynAI/README.md"]);
    expect(diagnostics.promptIntent?.intentFamily).toBe("repo-grounded");
    expect(diagnostics.policyDiagnostics?.classifier.categories.repo_grounded).toBe(true);
  });

  it("uses the generic-writing route family when routing is suppressed", () => {
    const diagnostics = buildChatExecutionDiagnostics({
      intentRoute: null,
      rawIntentRoute: null,
      awarenessUsed: false,
      deterministicAwareness: false,
      genericWritingPromptSuppressed: true,
      replyPolicy,
      policyDiagnostics,
      cleanupBypassed: true,
      routingSuppressionReason: "generic-writing prompt suppresses awareness routing",
      retrievedSourceSummary: null,
      reasoningMode: "advanced",
      evaluationSuiteMode: "chat-only",
      promptIntent
    });

    expect(diagnostics.routeFamily).toBe("generic-writing");
    expect(diagnostics.routeConfidence).toBeNull();
  });
});
