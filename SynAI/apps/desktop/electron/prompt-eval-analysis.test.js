import { describe, expect, it } from "vitest";
import { buildPromptEvaluationRoutingReport, evaluatePromptEvaluationCase } from "./prompt-eval-analysis";
const baseDiagnostics = {
    routeFamily: "repo-change",
    routeConfidence: 0.66,
    rawRouteFamily: "repo-change",
    rawRouteConfidence: 0.66,
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
        workspaceHitCount: 2,
        workspacePaths: ["SynAI/README.md"],
        awarenessSourceCount: 0,
        webResultCount: 0
    },
    reasoningMode: "advanced",
    evaluationSuiteMode: "chat-only"
};
const groundedSummary = (patch = {}) => ({
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
    it("passes when text, routing, and grounding expectations all hold", () => {
        const entry = {
            id: "medium-prompt",
            label: "Medium",
            difficulty: "medium",
            prompt: "Summarize the repo behavior.",
            sourceScopeHint: "repo-wide",
            formatPolicy: "preserve-exact-structure",
            checks: [
                {
                    id: "two-bullets",
                    kind: "bullet-count",
                    description: "Use exactly two bullets.",
                    exact: 2
                }
            ],
            routingExpectations: {
                awarenessUsed: false,
                deterministicAwareness: false,
                genericWritingPromptSuppressed: false
            },
            groundingExpectations: {
                minGroundedClaims: 1,
                maxUnsupportedClaims: 0,
                maxConflictedClaims: 0,
                minCitationCoverage: 0.5
            }
        };
        const result = evaluatePromptEvaluationCase(entry, "- First point.\n- Second point.", buildPromptEvaluationRoutingReport(baseDiagnostics), "success", groundedSummary());
        expect(result.qualityStatus).toBe("passed");
        expect(result.checkResults.every((check) => check.passed)).toBe(true);
    });
    it("fails when routing mismatches or grounding reports unsupported claims", () => {
        const entry = {
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
        const result = evaluatePromptEvaluationCase(entry, "Extra unsupported fact.", buildPromptEvaluationRoutingReport({
            ...baseDiagnostics,
            awarenessUsed: true
        }), "success", groundedSummary({
            unsupportedClaimCount: 1,
            groundedClaimCount: 1,
            claimCount: 2,
            citationCoverage: 0.5
        }));
        expect(result.qualityStatus).toBe("needs-review");
        expect(result.checkResults).toEqual(expect.arrayContaining([
            expect.objectContaining({
                id: "edge-prompt-awareness-used",
                passed: false
            }),
            expect.objectContaining({
                id: "edge-prompt-unsupported-claims",
                passed: false,
                detail: "Actual unsupported claims: 1."
            })
        ]));
    });
});
