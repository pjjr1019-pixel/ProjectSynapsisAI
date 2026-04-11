import { describe, expect, it } from "vitest";
import type { AgentTask } from "@agent-runtime/contracts";
import { PROMPT_INTENT_BRIDGE_METADATA_KEY } from "@agent-runtime/contracts/prompt-intent-bridge.contracts";
import type { PromptIntentContract, RetrievedPromptBehaviorMemory } from "@contracts";
import {
  attachPromptIntentBridgeToTask,
  buildPromptIntentRuntimeBridge,
  isAmbiguousFirstTimeTaskPrompt,
  shouldPersistResolvedPromptPattern
} from "./runtime-intent-bridge";
import type { PromptTaskClassificationResult } from "./task-classifier";

const basePromptIntent: PromptIntentContract = {
  intentFamily: "repo-grounded",
  userGoal: "Set up the repository for first-time use.",
  constraints: ["Use repo sources only."],
  sourceScope: "repo-wide",
  outputContract: {
    shape: "bullets",
    length: "short",
    preserveExactStructure: false
  },
  ambiguityFlags: ["missing-evidence"],
  missingEvidence: ["repo-evidence"],
  requiredChecks: ["respect-source-scope", "decompose-first-time-task"]
};

const baseTaskClassification: PromptTaskClassificationResult = {
  categories: {
    repo_grounded: true,
    exact_format: false,
    awareness_local_state: false,
    time_sensitive: false,
    governed_action: false,
    generic_writing: false,
    first_time_task: true,
    open_ended: false
  },
  repoGroundingSubtype: "repo-wide",
  rawSignals: ["scope:repo-wide"],
  fallbackSignals: ["fallback:repo-wide-pattern"]
};

const matchedMemories: RetrievedPromptBehaviorMemory[] = [
  {
    score: 0.9,
    reason: "intent",
    entry: {
      id: "pref-1",
      entryKind: "behavior_preference",
      sourceConversationId: "c1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      confidence: 0.8,
      lastAppliedAt: null,
      matchKey: "pref-key",
      matchHints: ["repo", "bullets"],
      summary: "Prefer compact repo bullets.",
      preferenceLabel: "compact repo bullets",
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "repo-wide",
        outputShape: "bullets",
        outputLength: "short",
        preserveExactStructure: false,
        requiredChecks: ["respect-source-scope"]
      }
    }
  },
  {
    score: 0.75,
    reason: "keyword",
    entry: {
      id: "pattern-1",
      entryKind: "resolved_pattern",
      sourceConversationId: "c1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
      confidence: 0.7,
      lastAppliedAt: null,
      matchKey: "pattern-key",
      matchHints: ["setup"],
      summary: "Resolved setup pattern.",
      patternSummary: "repo setup sections",
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "repo-wide",
        outputShape: "labeled-sections",
        outputLength: "short",
        preserveExactStructure: true,
        requiredChecks: ["respect-source-scope", "preserve-user-structure"]
      }
    }
  }
];

describe("runtime intent bridge", () => {
  it("builds a typed bridge with matched preference identifiers and clarification questions", () => {
    const bridge = buildPromptIntentRuntimeBridge(basePromptIntent, matchedMemories);

    expect(bridge.version).toBe(1);
    expect(bridge.preferenceIds).toEqual(["pref-1", "pattern-1"]);
    expect(bridge.resolvedPatternId).toBe("pattern-1");
    expect(bridge.clarification.needed).toBe(true);
    expect(bridge.clarification.questions[0]).toContain("first-time task");
  });

  it("attaches bridge metadata to tasks without overriding existing bridge values", () => {
    const task: AgentTask = {
      id: "task-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      title: "Runtime task",
      steps: [],
      metadata: {}
    };
    const withBridge = attachPromptIntentBridgeToTask(task, basePromptIntent, matchedMemories);
    const keptBridge = attachPromptIntentBridgeToTask(withBridge, basePromptIntent, []);

    expect(withBridge.metadata?.[PROMPT_INTENT_BRIDGE_METADATA_KEY]).toBeTruthy();
    expect(keptBridge.metadata?.[PROMPT_INTENT_BRIDGE_METADATA_KEY]).toEqual(
      withBridge.metadata?.[PROMPT_INTENT_BRIDGE_METADATA_KEY]
    );
  });

  it("keeps resolved-pattern persistence blocked for governed/time-sensitive/local-state prompts", () => {
    const blockedByGovernance = shouldPersistResolvedPromptPattern(basePromptIntent, {
      ...baseTaskClassification,
      categories: {
        ...baseTaskClassification.categories,
        governed_action: true
      }
    });
    const blockedByTimeSensitive = shouldPersistResolvedPromptPattern(
      {
        ...basePromptIntent,
        intentFamily: "time-sensitive-live"
      },
      {
        ...baseTaskClassification,
        categories: {
          ...baseTaskClassification.categories,
          time_sensitive: true
        }
      }
    );

    expect(blockedByGovernance).toBe(false);
    expect(blockedByTimeSensitive).toBe(false);
    expect(isAmbiguousFirstTimeTaskPrompt(basePromptIntent)).toBe(true);
  });
});
