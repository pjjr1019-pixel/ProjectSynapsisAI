import { describe, expect, it } from "vitest";
import type {
  ChatExecutionDiagnostics,
  ChatReplyPolicyDiagnostics,
  GroundingSummary,
  PromptEvaluationCaseInput
} from "@contracts";
import {
  buildPromptEvaluationRoutingReport,
  evaluatePromptEvaluationCase,
  normalizePromptEvaluationCases
} from "./prompt-eval-analysis";
import { canonicalPromptEvalCases } from "../../../tests/prompt-evals/canonical-cases";

const policyDiagnostics: ChatReplyPolicyDiagnostics = {
  rawSignals: ["scope:repo-wide", "format:exact-structure", "time:live-request"],
  fallbackSignals: ["fallback:repo-wide-pattern", "fallback:exact-structure-pattern"],
  classifier: {
    categories: {
      repo_grounded: true,
      exact_format: true,
      awareness_local_state: false,
      time_sensitive: true,
      governed_action: false,
      generic_writing: false,
      first_time_task: false,
      open_ended: false
    },
    repoGroundingSubtype: "repo-wide"
  },
  chosenPolicy: {
    sourceScope: "repo-wide",
    formatPolicy: "preserve-exact-structure",
    groundingPolicy: "source-boundary",
    routingPolicy: "chat-first-source-scoped"
  },
  suppressionReasons: ["repo-grounded scope suppresses awareness routing"]
};

const baseDiagnostics: ChatExecutionDiagnostics = {
  routeFamily: "repo-change",
  routeConfidence: 0.66,
  rawRouteFamily: "repo-change",
  rawRouteConfidence: 0.66,
  awarenessUsed: false,
  deterministicAwareness: false,
  genericWritingPromptSuppressed: false,
  sourceScope: "repo-wide",
  replyPolicy: policyDiagnostics.chosenPolicy,
  policyDiagnostics,
  cleanupBypassed: true,
  routingSuppressionReason: "repo-grounded scope suppresses awareness routing",
  retrievedSourceSummary: {
    memoryCount: 0,
    workspaceHitCount: 2,
    workspacePaths: ["SynAI/README.md"],
    awarenessSourceCount: 0,
    webResultCount: 0
  },
  reasoningMode: "advanced",
  evaluationSuiteMode: "chat-only"
};

const groundedSummary = (patch: Partial<GroundingSummary> = {}): GroundingSummary => ({
  overallConfidence: "high",
  claimCount: 2,
  groundedClaimCount: 2,
  inferenceClaimCount: 0,
  conflictedClaimCount: 0,
  unsupportedClaimCount: 0,
  usedSourceCount: 2,
  unusedSourceCount: 0,
  uniqueSourceKindCount: 1,
  citationCoverage: 1,
  sourceKindCounts: {
    memory: 0,
    workspace: 2,
    awareness: 0,
    official: 0,
    web: 0
  },
  topSourceIds: ["workspace-1", "workspace-2"],
  ...patch
});

describe("prompt evaluation analysis", () => {
  it("normalizes blank ids and trims prompt evaluation cases", () => {
    const normalized = normalizePromptEvaluationCases([
      {
        id: " ",
        label: " ",
        difficulty: "easy",
        prompt: "  Summarize the repo.  ",
        checks: [
          {
            id: " ",
            kind: "includes-any",
            description: " ",
            values: [" repo ", " docs "]
          }
        ]
      }
    ]);

    expect(normalized).toEqual([
      {
        id: "prompt-1",
        label: "Easy prompt",
        difficulty: "easy",
        prompt: "Summarize the repo.",
        checks: [
          {
            id: "prompt-1-check-1",
            kind: "includes-any",
            description: "Check 1",
            category: undefined,
            values: ["repo", "docs"],
            exact: undefined,
            min: undefined,
            max: undefined
          }
        ],
        sourceScopeHint: undefined,
        formatPolicy: undefined,
        replyPolicy: undefined,
        routingExpectations: undefined,
        groundingExpectations: undefined
      }
    ]);
  });

  it("passes when text, routing, and grounding expectations all hold", () => {
    const entry: PromptEvaluationCaseInput = canonicalPromptEvalCases[0];

    const result = evaluatePromptEvaluationCase(
      entry,
      "- Trigger: Use recent web search only when the README says the prompt is time-sensitive.\n- Action: Route through the repo-safe prompt path.\n- Surfacing: Show Context Preview so the user can see the scope.",
      buildPromptEvaluationRoutingReport({
        ...baseDiagnostics,
        sourceScope: "readme-only",
        replyPolicy: {
          sourceScope: "readme-only",
          formatPolicy: "preserve-exact-structure",
          groundingPolicy: "source-boundary",
          routingPolicy: "chat-first-source-scoped"
        },
        policyDiagnostics: {
          ...policyDiagnostics,
          classifier: {
            categories: {
              ...policyDiagnostics.classifier.categories
            },
            repoGroundingSubtype: "readme-only"
          },
          chosenPolicy: {
            sourceScope: "readme-only",
            formatPolicy: "preserve-exact-structure",
            groundingPolicy: "source-boundary",
            routingPolicy: "chat-first-source-scoped"
          }
        },
        routingSuppressionReason: "readme-only scope suppresses awareness routing"
      }),
      "success",
      groundedSummary()
    );

    expect(result.qualityStatus).toBe("passed");
    expect(result.checkResults.every((check) => check.passed)).toBe(true);
  });

  it("evaluates classifier expectations and exact line prefixes for repo-doc prompts mentioning Windows", () => {
    const entry = canonicalPromptEvalCases[1];
    const routing = buildPromptEvaluationRoutingReport({
      ...baseDiagnostics,
      sourceScope: "docs-only",
      replyPolicy: {
        sourceScope: "docs-only",
        formatPolicy: "preserve-exact-structure",
        groundingPolicy: "source-boundary",
        routingPolicy: "chat-first-source-scoped"
      },
      policyDiagnostics: {
        ...policyDiagnostics,
        classifier: {
          categories: {
            ...policyDiagnostics.classifier.categories,
            awareness_local_state: true
          },
          repoGroundingSubtype: "docs-only"
        },
        chosenPolicy: {
          sourceScope: "docs-only",
          formatPolicy: "preserve-exact-structure",
          groundingPolicy: "source-boundary",
          routingPolicy: "chat-first-source-scoped"
        }
      },
      routingSuppressionReason: "docs-only scope suppresses awareness routing"
    });

    const result = evaluatePromptEvaluationCase(
      entry,
      "- Evidence: The docs describe the formatting path for awareness answers.\n- Routing: The repo-scoped route still suppresses awareness execution for this prompt.",
      routing,
      "success",
      groundedSummary()
    );

    expect(result.qualityStatus).toBe("passed");
    expect(result.checkResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "docs-only-windows-routing-classifier-awareness_local_state", passed: true }),
        expect.objectContaining({ id: "docs-only-windows-routing-prefixes", passed: true })
      ])
    );
  });

  it("fails when routing mismatches or grounding reports unsupported claims", () => {
    const entry: PromptEvaluationCaseInput = {
      id: "edge-prompt",
      label: "Edge",
      difficulty: "edge",
      prompt: "Answer with grounded scope only.",
      routingExpectations: {
        awarenessUsed: false
      },
      groundingExpectations: {
        maxUnsupportedClaims: 0
      }
    };

    const result = evaluatePromptEvaluationCase(
      entry,
      "Extra unsupported fact.",
      buildPromptEvaluationRoutingReport({
        ...baseDiagnostics,
        awarenessUsed: true
      }),
      "success",
      groundedSummary({
        unsupportedClaimCount: 1,
        groundedClaimCount: 1,
        claimCount: 2,
        citationCoverage: 0.5
      })
    );

    expect(result.qualityStatus).toBe("needs-review");
    expect(result.checkResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "edge-prompt-awareness-used",
          passed: false
        }),
        expect.objectContaining({
          id: "edge-prompt-unsupported-claims",
          passed: false,
          detail: "Actual unsupported claims: 1."
        }),
        expect.objectContaining({
          id: "edge-prompt-awareness-used",
          passed: false
        })
      ])
    );
  });

  it("fails classifier expectations when an old brittle route would have slipped through", () => {
    const entry = canonicalPromptEvalCases[5];
    const result = evaluatePromptEvaluationCase(
      entry,
      "Goal\nSteps\nRisks",
      buildPromptEvaluationRoutingReport({
        ...baseDiagnostics,
        policyDiagnostics: {
          ...policyDiagnostics,
          classifier: {
            categories: {
              ...policyDiagnostics.classifier.categories,
              first_time_task: false
            },
            repoGroundingSubtype: "repo-wide"
          }
        }
      }),
      "success",
      groundedSummary()
    );

    expect(result.qualityStatus).toBe("needs-review");
    expect(result.checkResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "first-time-task-decomposition-classifier-first_time_task",
          passed: false
        })
      ])
    );
  });
});
