/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ContextPreview as ContextPreviewModel, ChatMessage } from "@contracts";
import { MessageItem } from "../../apps/desktop/src/features/local-chat/components/MessageItem";
import { ContextPreview } from "../../apps/desktop/src/features/local-chat/components/ContextPreview";

describe("grounding ui smoke", () => {
  it("renders inline citations, status badges, and the evidence panel for grounded replies", async () => {
    const message: ChatMessage = {
      id: "assistant-1",
      conversationId: "c1",
      role: "assistant",
      content: "Stored plain text reply",
      createdAt: "2026-04-09T10:00:00.000Z",
      metadata: {
        grounding: {
          sources: [
            {
              id: "workspace:chunk-1",
              kind: "workspace",
              title: "src/main.ts",
              label: "src/main.ts:10-20",
              excerpt: "The feature defaults to enabled.",
              path: "C:/repo/src/main.ts",
              lineStart: 10,
              lineEnd: 20
            },
            {
              id: "web:doc-1",
              kind: "web",
              title: "Docs page",
              label: "Docs",
              excerpt: "Fallback keyword ranking is used when embeddings are unavailable.",
              url: "https://example.com/docs"
            }
          ],
          claims: [
            {
              id: "claim:0",
              text: "The feature defaults to enabled.",
              sourceIds: ["workspace:chunk-1"],
              status: "grounded",
              confidence: "high"
            },
            {
              id: "claim:1",
              text: "Fallback ranking may be used when embeddings are unavailable.",
              sourceIds: ["web:doc-1"],
              status: "inference",
              confidence: "medium"
            }
          ],
          conflicts: [],
          summary: {
            overallConfidence: "medium",
            claimCount: 2,
            groundedClaimCount: 1,
            inferenceClaimCount: 1,
            conflictedClaimCount: 0,
            unsupportedClaimCount: 0,
            usedSourceCount: 2,
            unusedSourceCount: 0,
            uniqueSourceKindCount: 2,
            citationCoverage: 1,
            sourceKindCounts: {
              memory: 0,
              workspace: 1,
              awareness: 0,
              official: 0,
              web: 1
            },
            topSourceIds: ["workspace:chunk-1", "web:doc-1"]
          }
        }
      }
    };

    render(<MessageItem message={message} previousUserAt="2026-04-09T09:59:59.000Z" />);

    expect(screen.getAllByText("The feature defaults to enabled.").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Fallback ranking may be used when embeddings are unavailable.").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("S1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("S2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Inference")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Evidence"));
    expect(await screen.findByText("src/main.ts")).toBeInTheDocument();
    expect(screen.getByText("Docs page")).toBeInTheDocument();
  });

  it("shows retrieval diagnostics in the context preview", () => {
    const preview: ContextPreviewModel = {
      systemInstruction: "test",
      stableMemories: [],
      retrievedMemories: [],
      summarySnippet: "summary",
      recentMessagesCount: 2,
      estimatedChars: 120,
      workspaceHits: [],
      webSearch: {
        status: "off",
        query: "",
        results: []
      },
      grounding: {
        overallConfidence: "medium",
        claimCount: 2,
        groundedClaimCount: 1,
        inferenceClaimCount: 1,
        conflictedClaimCount: 0,
        unsupportedClaimCount: 0,
        usedSourceCount: 2,
        unusedSourceCount: 1,
        uniqueSourceKindCount: 2,
        citationCoverage: 1,
        sourceKindCounts: {
          memory: 0,
          workspace: 1,
          awareness: 0,
          official: 0,
          web: 2
        },
        topSourceIds: ["workspace:chunk-1", "web:doc-1"]
      },
      retrievalEval: {
        routeReason: "auto-complexity",
        retrievedSourceCount: 3,
        usedSourceCount: 2,
        unusedSourceCount: 1,
        citationCoverage: 1,
        unsupportedClaimCount: 0,
        conflictedClaimCount: 0,
        sourceKindCounts: {
          memory: 0,
          workspace: 1,
          awareness: 0,
          official: 0,
          web: 2
        },
        topSourceIds: ["workspace:chunk-1", "web:doc-1"],
        warnings: ["Most retrieved sources were not cited."]
      },
      runtimePreview: {
        jobId: "job-1",
        taskId: "task-1",
        taskTitle: "Review the latest runtime job",
        jobStatus: "denied",
        resultStatus: "denied",
        plannedStepCount: 4,
        policyDecisionType: "allow",
        verificationStatus: "failed",
        checkpointId: "ckpt-1",
        checkpointSummary: "Approval token has expired.",
        auditEventCount: 5,
        bindingHash: "fnv1a-12345678",
        updatedAt: "2026-04-10T10:00:00.000Z"
      },
      promptIntent: {
        intentFamily: "repo-grounded",
        userGoal: "Summarize the current repo behavior without guessing.",
        constraints: ["Stay within the repo evidence that was retrieved."],
        sourceScope: "repo-wide",
        outputContract: {
          shape: "bullets",
          length: "short",
          preserveExactStructure: false
        },
        ambiguityFlags: [],
        missingEvidence: [],
        requiredChecks: ["respect-source-scope"]
      }
    };

    render(<ContextPreview preview={preview} />);

    expect(screen.getByText("Evidence & Retrieval Eval")).toBeInTheDocument();
    expect(screen.getByText(/Route auto-complexity/i)).toBeInTheDocument();
    expect(screen.getByText(/Most retrieved sources were not cited/i)).toBeInTheDocument();
    expect(screen.getByText("Prompt Intent")).toBeInTheDocument();
    expect(screen.getByText(/repo-grounded \| repo-wide \| bullets/i)).toBeInTheDocument();
    expect(screen.getByText("Agent Runtime")).toBeInTheDocument();
    expect(screen.getByText(/Review the latest runtime job/i)).toBeInTheDocument();
    expect(screen.getByText(/Approval token has expired/i)).toBeInTheDocument();
  });
});
