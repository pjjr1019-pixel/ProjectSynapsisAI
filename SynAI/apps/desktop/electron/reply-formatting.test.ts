import { describe, expect, it } from "vitest";
import type { AwarenessQueryAnswer } from "@contracts";
import { cleanupPlainTextAnswer, formatAwarenessReply } from "./reply-formatting";

const freshness = {
  capturedAt: "2026-04-09T11:00:00.000Z",
  generatedAt: "2026-04-09T11:00:00.000Z",
  observedAt: "2026-04-09T11:00:00.000Z",
  ageMs: 0,
  staleAfterMs: 60_000,
  isFresh: true
} as const;

const makeAnswer = (patch?: Partial<AwarenessQueryAnswer>): AwarenessQueryAnswer => ({
  id: "answer-1",
  query: "what changed",
  generatedAt: "2026-04-09T11:00:00.000Z",
  intent: {
    family: "repo-change",
    label: "Repo / change awareness",
    confidence: 0.9,
    signals: ["change"],
    targetAreas: ["repo"]
  },
  intentPlan: null,
  scope: "current-machine",
  mode: "medium",
  answerMode: "evidence-first",
  strictGrounding: true,
  scanTimedOut: false,
  scanTargets: [],
  includeInContext: true,
  summary: "summary",
  bundle: {
    verifiedFindings: ["You have 205.5 GB free on C: out of 475.4 GB total.", "Windows 11 is running normally.", "Uptime: 8h 34m", "No storage errors were captured."],
    officialVerified: [],
    likelyInterpretation: ["The drive has healthy free space right now."],
    inferredFindings: [],
    uncertainty: [],
    suggestedNextChecks: [],
    safeNextAction: null,
    confidence: 0.92,
    confidenceLevel: "high",
    groundingStatus: "grounded",
    evidenceTraceIds: [],
    freshness,
    evidenceRefs: [],
    affectedAreas: ["machine"],
    compactSummary: "summary",
    resourceHotspots: [],
    recurringPatterns: [],
    screenDiff: null,
    correlationHighlights: []
  },
  clarification: null,
  card: null,
  ...patch
});

describe("reply formatting", () => {
  it("formats grounded awareness answers as a direct sentence plus a few bullets", () => {
    const formatted = formatAwarenessReply(makeAnswer());
    expect(formatted.split("\n")[0]).toBe("You have 205.5 GB free on C: out of 475.4 GB total.");
    expect(formatted).toContain("- Windows 11 is running normally.");
    expect(formatted).toContain("- Uptime: 8h 34m");
    expect(formatted).not.toContain("Confidence:");
    expect(formatted).not.toContain("Grounding:");
  });

  it("keeps live storage replies focused on the drive answer first", () => {
    const formatted = formatAwarenessReply(
      makeAnswer({
        query: "how much free storage do i have",
        intent: {
          family: "live-usage",
          label: "Live usage awareness",
          confidence: 0.95,
          signals: ["drive-storage"],
          targetAreas: ["machine"]
        },
        bundle: {
          ...makeAnswer().bundle,
          verifiedFindings: [
            "You have 205.5 GB free on C: (Acer) out of 475.4 GB total.",
            "Current RAM: 6.9 GB used of 7.7 GB (89%) | available 855.5 MB",
            "Uptime: 14h 22m"
          ]
        }
      })
    );

    expect(formatted.split("\n")[0]).toContain("You have 205.5 GB free on C:");
    expect(formatted).not.toContain("Current RAM");
    expect(formatted).not.toContain("Uptime");
  });

  it("keeps live CPU replies focused on CPU instead of adding RAM and uptime", () => {
    const formatted = formatAwarenessReply(
      makeAnswer({
        query: "what is my cpu usage right now",
        intent: {
          family: "live-usage",
          label: "Live usage awareness",
          confidence: 0.95,
          signals: ["cpu-usage"],
          targetAreas: ["machine"]
        },
        bundle: {
          ...makeAnswer().bundle,
          verifiedFindings: [
            "Current CPU load: 5%",
            "Current RAM: 6.0 GB used of 7.7 GB (78%) | available 1.7 GB",
            "Uptime: 1d 2h"
          ]
        }
      })
    );

    expect(formatted).toBe("Current CPU load: 5%");
    expect(formatted).not.toContain("Current RAM");
    expect(formatted).not.toContain("Uptime");
  });

  it("keeps live CPU and RAM replies focused and ordered", () => {
    const formatted = formatAwarenessReply(
      makeAnswer({
        query: "what is my cpu and ram usage right now",
        intent: {
          family: "live-usage",
          label: "Live usage awareness",
          confidence: 0.95,
          signals: ["cpu-usage", "ram-usage"],
          targetAreas: ["machine"]
        },
        bundle: {
          ...makeAnswer().bundle,
          verifiedFindings: [
            "Current CPU load: 5%",
            "Current RAM: 6.0 GB used of 7.7 GB (78%) | available 1.7 GB",
            "Uptime: 1d 2h"
          ]
        }
      })
    );

    expect(formatted).toBe(
      ["Current CPU load: 5%", "Current RAM: 6.0 GB used of 7.7 GB (78%) | available 1.7 GB"].join("\n")
    );
    expect(formatted).not.toContain("Uptime");
  });

  it("keeps settings replies focused and drops unrelated registry or doc boilerplate", () => {
    const formatted = formatAwarenessReply(
      makeAnswer({
        query: "where is the bluetooth setting in windows",
        intent: {
          family: "settings-control-panel",
          label: "Settings / control panel awareness",
          confidence: 0.95,
          signals: ["bluetooth-setting"],
          targetAreas: ["machine", "context"]
        },
        bundle: {
          ...makeAnswer().bundle,
          verifiedFindings: [
            "Bluetooth & devices opens with ms-settings:bluetooth",
            "System opens with control.exe sysdm.cpl",
            "uninstall-apps is usually controlled at HKLM/HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
          ],
          officialVerified: [
            "Microsoft: Launch Windows Settings - Windows apps | Microsoft Learn — Skip to main content"
          ]
        }
      })
    );

    expect(formatted).toBe("Bluetooth & devices opens with ms-settings:bluetooth");
    expect(formatted).not.toContain("sysdm.cpl");
    expect(formatted).not.toContain("HKLM");
    expect(formatted).not.toContain("Skip to main content");
  });

  it("cleans markdown emphasis and report-style labels from plain text answers", () => {
    const cleaned = cleanupPlainTextAnswer(
      [
        "Direct answer: You have **205.5 GB** free.",
        "",
        "Verified evidence: Windows is healthy.",
        "Confidence: high",
        "Grounding: grounded"
      ].join("\n")
    );

    expect(cleaned).toContain("You have 205.5 GB free.");
    expect(cleaned).toContain("Windows is healthy.");
    expect(cleaned).not.toContain("**");
    expect(cleaned).not.toContain("Direct answer:");
    expect(cleaned).not.toContain("Confidence:");
    expect(cleaned).not.toContain("Grounding:");
  });
});

