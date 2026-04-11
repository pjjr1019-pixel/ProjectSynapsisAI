const TRACE_STAGE_LABELS = {
    route: "Route",
    "retrieve-memory": "Retrieve memory",
    "retrieve-workspace": "Retrieve workspace",
    "retrieve-awareness": "Retrieve awareness",
    "retrieve-web": "Retrieve web",
    plan: "Plan",
    synthesize: "Synthesize",
    verify: "Verify"
};
export const createEmptyRetrievalStats = () => ({
    memoryKeyword: 0,
    memorySemantic: 0,
    workspace: 0,
    awareness: 0,
    web: 0,
    total: 0
});
export const withRetrievalTotals = (stats) => ({
    ...stats,
    total: stats.memoryKeyword + stats.memorySemantic + stats.workspace + stats.awareness + stats.web
});
const clamp = (value) => Math.max(0, Math.min(1, value));
const complexityKeywords = [
    "analyze",
    "architecture",
    "compare",
    "complex",
    "entire",
    "explain",
    "improve",
    "multi-step",
    "optimize",
    "reason",
    "refine",
    "scan",
    "tradeoff",
    "whole"
];
export const detectReasoningMode = (input) => {
    const normalized = input.query.toLowerCase();
    const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
    const keywordMatches = complexityKeywords.filter((keyword) => normalized.includes(keyword)).length;
    const conjunctions = [" and ", " then ", " also ", " plus ", " compare ", " versus ", " vs "].filter((token) => normalized.includes(token)).length;
    const questionMarks = [...normalized].filter((character) => character === "?").length;
    const lineBreaks = input.query.split(/\r?\n/).length - 1;
    const retrievalPressure = (input.memoryHitCount ?? 0) === 0 ? 0.08 : 0;
    const lowAwarenessPenalty = input.awarenessConfidenceLevel === "low" ? 0.1 : 0;
    const score = clamp((tokenCount >= 18 ? 0.18 : tokenCount >= 10 ? 0.1 : 0) +
        keywordMatches * 0.08 +
        conjunctions * 0.09 +
        (questionMarks > 1 ? 0.08 : 0) +
        (lineBreaks > 0 ? 0.08 : 0) +
        retrievalPressure +
        lowAwarenessPenalty);
    if (input.override === "on") {
        return {
            mode: "advanced",
            triggerReason: "manual-rag-on",
            complexityScore: Math.max(score, 0.95)
        };
    }
    if (input.override === "off") {
        return {
            mode: "fast",
            triggerReason: "manual-rag-off",
            complexityScore: score
        };
    }
    if (!input.ragEnabled) {
        return {
            mode: "fast",
            triggerReason: "rag-disabled",
            complexityScore: score
        };
    }
    if (score >= 0.35) {
        return {
            mode: "advanced",
            triggerReason: "auto-complexity",
            complexityScore: score
        };
    }
    return {
        mode: "fast",
        triggerReason: "simple-query",
        complexityScore: score
    };
};
const createStage = (id, status = "pending", summary = null) => ({
    id,
    label: TRACE_STAGE_LABELS[id],
    status,
    startedAt: null,
    endedAt: null,
    durationMs: null,
    summary,
    detail: null,
    sourceCount: null
});
export const createReasoningTraceState = (input) => {
    const stages = [
        createStage("route"),
        createStage("retrieve-memory"),
        createStage("retrieve-workspace", input.includeWorkspace ? "pending" : "skipped", input.includeWorkspace ? null : "Workspace retrieval off"),
        createStage("retrieve-awareness"),
        createStage("retrieve-web", input.includeWeb ? "pending" : "skipped", input.includeWeb ? null : "Web retrieval off"),
        createStage("plan", input.mode === "advanced" ? "pending" : "skipped", input.mode === "advanced" ? null : "Fast path"),
        createStage("synthesize"),
        createStage("verify")
    ];
    return {
        requestId: input.requestId,
        conversationId: input.conversationId,
        mode: input.mode,
        triggerReason: input.triggerReason,
        visible: input.visible,
        startedAt: new Date().toISOString(),
        completedAt: null,
        confidence: "medium",
        retrieval: createEmptyRetrievalStats(),
        groundedSourceCount: 0,
        grounding: null,
        stages
    };
};
const nowIso = () => new Date().toISOString();
const patchStage = (trace, stageId, patch) => ({
    ...trace,
    stages: trace.stages.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage))
});
export const startTraceStage = (trace, stageId) => patchStage(trace, stageId, {
    status: "running",
    startedAt: nowIso(),
    endedAt: null,
    durationMs: null
});
export const completeTraceStage = (trace, stageId, input) => {
    const stage = trace.stages.find((candidate) => candidate.id === stageId);
    const endedAt = nowIso();
    const startedAt = stage?.startedAt ?? endedAt;
    return patchStage(trace, stageId, {
        status: "completed",
        endedAt,
        durationMs: Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()),
        summary: input?.summary ?? stage?.summary ?? null,
        detail: input?.detail ?? stage?.detail ?? null,
        sourceCount: input?.sourceCount ?? stage?.sourceCount ?? null
    });
};
export const failTraceStage = (trace, stageId, message) => patchStage(trace, stageId, {
    status: "error",
    endedAt: nowIso(),
    summary: message,
    detail: message
});
export const updateTraceRetrieval = (trace, retrieval) => ({
    ...trace,
    retrieval: withRetrievalTotals(retrieval),
    groundedSourceCount: withRetrievalTotals(retrieval).total
});
export const updateTraceGrounding = (trace, grounding) => ({
    ...trace,
    grounding
});
export const verifyTraceConfidence = (input) => {
    const total = input.retrieval.total;
    if (total <= 1) {
        return "low";
    }
    if (input.awarenessConfidenceLevel === "low") {
        return total >= 4 ? "medium" : "low";
    }
    if (input.mode === "advanced" && input.retrieval.workspace > 0 && total >= 4) {
        return "high";
    }
    return total >= 3 ? "medium" : "low";
};
export const finalizeReasoningTrace = (trace, input) => ({
    ...trace,
    completedAt: nowIso(),
    confidence: input?.confidence ?? trace.confidence
});
export const toReasoningTraceSummary = (trace) => ({
    mode: trace.mode,
    triggerReason: trace.triggerReason,
    confidence: trace.confidence,
    totalDurationMs: Math.max(0, new Date(trace.completedAt ?? nowIso()).getTime() - new Date(trace.startedAt).getTime()),
    retrieval: trace.retrieval,
    groundedSourceCount: trace.groundedSourceCount,
    grounding: trace.grounding ?? null,
    stages: trace.stages
});
