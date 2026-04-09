import { describe, expect, it } from "vitest";
import {
  completeTraceStage,
  createEmptyRetrievalStats,
  createReasoningTraceState,
  detectReasoningMode,
  finalizeReasoningTrace,
  toReasoningTraceSummary,
  updateTraceRetrieval,
  verifyTraceConfidence
} from "../src/reasoning/chat";

describe("reasoning chat orchestration", () => {
  it("routes simple prompts to the fast path by default", () => {
    const result = detectReasoningMode({
      query: "Say hello",
      ragEnabled: true
    });

    expect(result.mode).toBe("fast");
    expect(result.triggerReason).toBe("simple-query");
    expect(result.complexityScore).toBeLessThan(0.35);
  });

  it("routes complex prompts to advanced reasoning and respects manual overrides", () => {
    const autoResult = detectReasoningMode({
      query: "Scan the entire workspace, compare options, analyze tradeoffs, and refine the architecture plan",
      ragEnabled: true,
      memoryHitCount: 0,
      awarenessConfidenceLevel: "low"
    });

    expect(autoResult.mode).toBe("advanced");
    expect(autoResult.triggerReason).toBe("auto-complexity");

    const forcedFast = detectReasoningMode({
      query: "Deeply analyze this system",
      ragEnabled: true,
      override: "off"
    });

    expect(forcedFast.mode).toBe("fast");
    expect(forcedFast.triggerReason).toBe("manual-rag-off");

    const forcedAdvanced = detectReasoningMode({
      query: "hello",
      ragEnabled: false,
      override: "on"
    });

    expect(forcedAdvanced.mode).toBe("advanced");
    expect(forcedAdvanced.triggerReason).toBe("manual-rag-on");
  });

  it("builds a persisted trace summary with retrieval totals and verification confidence", () => {
    let trace = createReasoningTraceState({
      requestId: "req-1",
      conversationId: "conv-1",
      mode: "advanced",
      triggerReason: "auto-complexity",
      visible: true,
      includeWeb: true,
      includeWorkspace: true
    });

    trace = updateTraceRetrieval(trace, {
      ...createEmptyRetrievalStats(),
      memoryKeyword: 2,
      memorySemantic: 1,
      workspace: 3,
      awareness: 1,
      web: 2
    });
    trace = completeTraceStage(trace, "verify", {
      summary: "high confidence",
      sourceCount: trace.retrieval.total
    });
    trace = finalizeReasoningTrace(trace, {
      confidence: verifyTraceConfidence({
        mode: trace.mode,
        retrieval: trace.retrieval,
        awarenessConfidenceLevel: "medium"
      })
    });

    const summary = toReasoningTraceSummary(trace);

    expect(summary.retrieval.total).toBe(9);
    expect(summary.groundedSourceCount).toBe(9);
    expect(summary.confidence).toBe("high");
    expect(summary.stages.find((stage) => stage.id === "verify")?.summary).toBe("high confidence");
  });
});
