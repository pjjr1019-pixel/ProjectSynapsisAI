import { describe, expect, it } from "vitest";
import type { AwarenessQueryAnswer } from "../src/contracts/awareness";
import {
  buildGroundingSourceCatalog,
  groundAssistantReply,
  segmentAnswerClaims
} from "../src/reasoning/grounding";

const freshness = {
  capturedAt: "2026-04-09T11:00:00.000Z",
  generatedAt: "2026-04-09T11:00:00.000Z",
  observedAt: "2026-04-09T11:00:00.000Z",
  ageMs: 0,
  staleAfterMs: 60_000,
  isFresh: true
} as const;

const makeAwarenessAnswer = (): AwarenessQueryAnswer => ({
  id: "answer-1",
  query: "where is the bluetooth setting in windows",
  generatedAt: "2026-04-09T11:00:00.000Z",
  intent: {
    family: "settings-control-panel",
    label: "Settings / control panel awareness",
    confidence: 0.95,
    signals: ["bluetooth-setting"],
    targetAreas: ["machine", "context"]
  },
  intentPlan: null,
  scope: "current-machine",
  mode: "medium",
  answerMode: "evidence-first",
  strictGrounding: true,
  scanTimedOut: false,
  scanTargets: [],
  includeInContext: true,
  summary: "Bluetooth & devices opens with ms-settings:bluetooth",
  bundle: {
    verifiedFindings: ["Bluetooth & devices opens with ms-settings:bluetooth"],
    officialVerified: [],
    likelyInterpretation: [],
    inferredFindings: [],
    uncertainty: [],
    suggestedNextChecks: [],
    safeNextAction: null,
    confidence: 0.95,
    confidenceLevel: "high",
    groundingStatus: "grounded",
    evidenceTraceIds: [],
    freshness,
    evidenceRefs: [],
    affectedAreas: ["machine"],
    compactSummary: "Bluetooth settings path",
    resourceHotspots: [],
    recurringPatterns: [],
    screenDiff: null,
    correlationHighlights: []
  },
  clarification: null,
  card: null
});

describe("grounding", () => {
  it("skips section titles but keeps structured bullet claims", () => {
    const claims = segmentAnswerClaims(
      ["Built now", "- local Ollama chat", "Not built yet", "- cloud sync and multi-agent systems"].join("\n")
    );

    expect(claims).toEqual(["local Ollama chat", "cloud sync and multi-agent systems"]);
  });

  it("grounds short deterministic Windows settings answers from synthetic awareness bundle sources", async () => {
    const awarenessQuery = makeAwarenessAnswer();
    const sources = buildGroundingSourceCatalog({
      awarenessQuery
    });

    const grounded = await groundAssistantReply({
      answerText: "Bluetooth & devices opens with ms-settings:bluetooth",
      sources,
      routeReason: "test",
      awarenessQuery,
      deterministicAwareness: true,
      sourceScopeApplied: "awareness-only"
    });

    expect(grounded.metadata.summary.groundedClaimCount).toBeGreaterThanOrEqual(1);
    expect(grounded.metadata.summary.unsupportedClaimCount).toBe(0);
    expect(grounded.metadata.matchedEvidenceIds).toEqual(
      expect.arrayContaining(["awareness:bundle:answer-1"])
    );
    expect(grounded.metadata.sourceScopeApplied).toBe("awareness-only");
  });
});
