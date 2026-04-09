import { describe, expect, it } from "vitest";
import type { PromptEvaluationResponse } from "@contracts";
import {
  buildPromptEvaluationReportFileName,
  formatPromptEvaluationMarkdown
} from "./prompt-eval";

const report: PromptEvaluationResponse = {
  suiteName: "Windows Grounding Eval",
  generatedAt: "2026-04-09T19:15:30.000Z",
  reportPath: "C:/workspace/.runtime/prompt-evals/20260409-191530Z-windows-grounding-eval.md",
  reportFileName: "20260409-191530Z-windows-grounding-eval.md",
  workspaceRoot: "C:/workspace",
  settings: {
    suiteMode: "windows-awareness",
    model: "phi4-mini:latest",
    responseMode: "balanced",
    awarenessAnswerMode: "evidence-first",
    ragEnabled: true,
    useWebSearch: false,
    showTrace: false,
    workspaceIndexingEnabled: true
  },
  summary: {
    total: 2,
    successCount: 1,
    errorCount: 1,
    qualityPassCount: 1,
    qualityNeedsReviewCount: 1
  },
  comparison: null,
  cases: [
    {
      id: "easy-prompt",
      label: "Easy",
      difficulty: "easy",
      prompt: "Summarize this clearly.",
      checks: [
        {
          id: "mentions-clarity",
          kind: "includes-any",
          description: "Mention a clear answer.",
          values: ["short answer", "fact"]
        }
      ],
      reply: "Short answer.\n- First fact\n- Second fact",
      startedAt: "2026-04-09T19:15:31.000Z",
      completedAt: "2026-04-09T19:15:32.500Z",
      durationMs: 1500,
      status: "success",
      qualityStatus: "passed",
      modelStatus: {
        status: "connected",
        provider: "ollama",
        model: "phi4-mini:latest",
        baseUrl: "http://127.0.0.1:11434",
        checkedAt: "2026-04-09T19:15:32.500Z"
      },
      traceSummary: {
        mode: "advanced",
        triggerReason: "complex request",
        confidence: "high",
        totalDurationMs: 1500,
        retrieval: {
          memoryKeyword: 1,
          memorySemantic: 0,
          workspace: 2,
          awareness: 1,
          web: 0,
          total: 4
        },
        groundedSourceCount: 4,
        grounding: null,
        stages: []
      },
      routing: {
        routeFamily: "live-usage",
        routeConfidence: 0.88,
        rawRouteFamily: "live-usage",
        rawRouteConfidence: 0.88,
        awarenessUsed: true,
        deterministicAwareness: false,
        genericWritingPromptSuppressed: false,
        sourceScope: "awareness-only",
        replyPolicy: {
          sourceScope: "awareness-only",
          formatPolicy: "default",
          groundingPolicy: "awareness-direct",
          routingPolicy: "windows-explicit-only"
        },
        cleanupBypassed: false,
        routingSuppressionReason: null,
        retrievedSourceSummary: {
          memoryCount: 1,
          workspaceHitCount: 2,
          workspacePaths: ["SynAI/README.md", "SynAI/CHANGELOG.md"],
          awarenessSourceCount: 1,
          webResultCount: 0
        },
        reasoningMode: "advanced"
      },
      checkResults: [
        {
          id: "mentions-clarity",
          description: "Mention a clear answer.",
          passed: true,
          detail: "Matched phrase: short answer."
        }
      ]
    },
    {
      id: "hard-prompt",
      label: "Hard",
      difficulty: "hard",
      prompt: "Handle uncertainty without guessing.",
      checks: [
        {
          id: "has-known-section",
          kind: "includes-all",
          description: "Use the requested Known heading.",
          values: ["Known"]
        }
      ],
      reply: "Prompt evaluation failed: model timeout",
      startedAt: "2026-04-09T19:15:33.000Z",
      completedAt: "2026-04-09T19:15:36.000Z",
      durationMs: 3000,
      status: "error",
      qualityStatus: "needs-review",
      modelStatus: {
        status: "error",
        provider: "ollama",
        model: "phi4-mini:latest",
        baseUrl: "http://127.0.0.1:11434",
        detail: "model timeout",
        checkedAt: "2026-04-09T19:15:36.000Z"
      },
      traceSummary: null,
      routing: {
        routeFamily: "none",
        routeConfidence: null,
        rawRouteFamily: "none",
        rawRouteConfidence: null,
        awarenessUsed: false,
        deterministicAwareness: false,
        genericWritingPromptSuppressed: false,
        sourceScope: "repo-wide",
        replyPolicy: {
          sourceScope: "repo-wide",
          formatPolicy: "preserve-exact-structure",
          groundingPolicy: "source-boundary",
          routingPolicy: "chat-first-source-scoped"
        },
        cleanupBypassed: true,
        routingSuppressionReason: "repo-grounded scope suppresses awareness routing",
        retrievedSourceSummary: {
          memoryCount: 0,
          workspaceHitCount: 0,
          workspacePaths: [],
          awarenessSourceCount: 0,
          webResultCount: 0
        },
        reasoningMode: null
      },
      checkResults: [
        {
          id: "has-known-section",
          description: "Use the requested Known heading.",
          passed: false,
          detail: "Skipped because the prompt returned an error."
        }
      ]
    }
  ]
};

describe("prompt evaluation markdown", () => {
  it("builds a readable timestamped report filename", () => {
    expect(
      buildPromptEvaluationReportFileName(report.suiteName, report.generatedAt)
    ).toBe("20260409-191530Z-windows-grounding-eval.md");
  });

  it("formats summary tables, settings, prompts, and replies into markdown", () => {
    const markdown = formatPromptEvaluationMarkdown(report);

    expect(markdown).toContain("# Windows Grounding Eval");
    expect(markdown).toContain("- Suite mode: windows-awareness");
    expect(markdown).toContain("- Model: phi4-mini:latest");
    expect(markdown).toContain("- Quality passed: 1");
    expect(markdown).toContain("### Failure Groups");
    expect(markdown).toContain("| easy | Easy | success | passed | 1.50 s | high | live-usage @ 0.88 | awareness-only | yes | no | 1/1 |");
    expect(markdown).toContain("| hard | Hard | error | needs-review | 3.00 s | n/a | none | repo-wide | no | no | 0/1 |");
    expect(markdown).toContain("## Easy (easy)");
    expect(markdown).toContain("- Route: live-usage @ 0.88");
    expect(markdown).toContain("- Raw route: live-usage @ 0.88");
    expect(markdown).toContain("- Source scope: awareness-only");
    expect(markdown).toContain("- Awareness used: yes");
    expect(markdown).toContain("- Cleanup bypassed: no");
    expect(markdown).toContain("### Checks");
    expect(markdown).toContain("- PASS | Mention a clear answer. | Matched phrase: short answer.");
    expect(markdown).toContain("### Prompt");
    expect(markdown).toContain("Summarize this clearly.");
    expect(markdown).toContain("### Reply");
    expect(markdown).toContain("Short answer.");
    expect(markdown).toContain("Handle uncertainty without guessing.");
    expect(markdown).toContain("Prompt evaluation failed: model timeout");
    expect(markdown).toContain("- Routing suppression: repo-grounded scope suppresses awareness routing");
    expect(markdown).toContain("- FAIL | Use the requested Known heading. | Skipped because the prompt returned an error.");
  });
});
