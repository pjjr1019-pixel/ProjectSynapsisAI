import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/grounding-eval-fixtures.json";
import { detectReasoningMode, groundAssistantReply } from "../src/reasoning";
const awarenessAnswer = () => ({
    id: "awareness-eval",
    query: "cpu",
    generatedAt: "2026-04-09T10:00:00.000Z",
    intent: {
        family: "live-usage",
        label: "Live usage",
        confidence: 0.9,
        signals: ["cpu"],
        targetAreas: ["machine"]
    },
    scope: "current-machine",
    mode: "short",
    answerMode: "evidence-first",
    strictGrounding: true,
    includeInContext: true,
    summary: "CPU is using 12%.",
    bundle: {
        verifiedFindings: ["CPU is using 12%."],
        officialVerified: [],
        likelyInterpretation: ["This spike may be temporary."],
        inferredFindings: [],
        uncertainty: [],
        suggestedNextChecks: [],
        safeNextAction: null,
        confidence: 0.92,
        confidenceLevel: "high",
        groundingStatus: "grounded",
        evidenceTraceIds: ["trace-1", "trace-2", "trace-3"],
        freshness: {
            capturedAt: "2026-04-09T10:00:00.000Z",
            generatedAt: "2026-04-09T10:00:00.000Z",
            observedAt: "2026-04-09T10:00:00.000Z",
            ageMs: 0,
            staleAfterMs: 10000,
            isFresh: true
        },
        evidenceRefs: [
            {
                id: "cpu-snapshot",
                kind: "api",
                label: "CPU snapshot"
            }
        ],
        affectedAreas: ["machine"],
        compactSummary: "CPU 12%"
    }
});
describe("grounding eval fixtures", () => {
    it("covers workspace, mixed, awareness, and conflicting evidence scenarios", async () => {
        const acceptableConfidenceLevels = {
            low: ["low"],
            medium: ["medium", "high"],
            high: ["medium", "high"]
        };
        for (const fixture of fixtures) {
            const routing = detectReasoningMode({
                query: fixture.prompt,
                ragEnabled: true,
                override: "inherit"
            });
            expect(routing.mode).toBe(fixture.expected.routeMode);
            const grounded = await groundAssistantReply({
                answerText: fixture.answerText,
                sources: fixture.sources,
                routeReason: routing.triggerReason,
                awarenessQuery: fixture.name === "awareness-only grounding" ? awarenessAnswer() : null,
                deterministicAwareness: fixture.name === "awareness-only grounding"
            });
            const citedKinds = grounded.metadata.claims
                .flatMap((claim) => claim.sourceIds)
                .map((sourceId) => grounded.metadata.sources.find((source) => source.id === sourceId)?.kind)
                .filter((kind) => Boolean(kind));
            const citedKindSet = new Set(citedKinds);
            for (const kind of fixture.expected.topKinds) {
                expect(citedKindSet.has(kind)).toBe(true);
            }
            expect(grounded.metadata.summary.citationCoverage).toBeGreaterThanOrEqual(fixture.expected.minCitationCoverage);
            expect(acceptableConfidenceLevels[fixture.expected.confidence]).toContain(grounded.metadata.summary.overallConfidence);
            expect(grounded.metadata.summary.conflictedClaimCount).toBe(fixture.expected.conflictedClaimCount);
            expect(grounded.metadata.summary.unsupportedClaimCount).toBe(fixture.expected.unsupportedClaimCount);
        }
    });
});
