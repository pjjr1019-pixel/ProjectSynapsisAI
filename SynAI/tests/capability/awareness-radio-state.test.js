import { describe, expect, it } from "vitest";
import { buildAwarenessQueryAnswer } from "../../packages/Awareness-Reasoning/src/reasoning";
const buildInput = (query) => ({
    query,
    current: {
        machineAwareness: {
            freshness: {
                capturedAt: "2026-04-10T12:00:00.000Z",
                generatedAt: "2026-04-10T12:00:00.000Z",
                observedAt: "2026-04-10T12:00:00.000Z",
                ageMs: 0,
                staleAfterMs: 60_000,
                isFresh: true
            },
            systemIdentity: {
                hardware: {
                    radioState: {
                        bluetoothEnabled: true,
                        wifiEnabled: false,
                        airplaneModeEnabled: true
                    }
                }
            }
        }
    },
    paths: {
        currentSessionPath: "C:/runtime/current-session.json",
        previousSessionPath: "C:/runtime/previous-session.json",
        lastReportedBaselinePath: "C:/runtime/last-reported-baseline.json",
        latestDigestPath: "C:/runtime/latest-digest.json",
        eventsPath: "C:/runtime/events.jsonl"
    }
});
describe("awareness radio state answers", () => {
    it("reports bluetooth, wifi, and airplane mode state directly from machine awareness", () => {
        const answer = buildAwarenessQueryAnswer(buildInput("is my bluetooth wifi airplane mode on or off?"));
        expect(answer).not.toBeNull();
        expect(answer?.bundle.verifiedFindings).toEqual(expect.arrayContaining([
            "Bluetooth radio is on.",
            "Wi-Fi radio is off.",
            "Airplane mode is on."
        ]));
        expect(answer?.bundle.likelyInterpretation).toEqual(expect.arrayContaining([
            "Bluetooth is on on this machine.",
            "Wi-Fi is off on this machine.",
            "Airplane mode is on on this machine."
        ]));
    });
});
