import { describe, expect, it } from "vitest";
import type { VolumeAwarenessSnapshot } from "../src/contracts/awareness";
import { refreshVolumeJournalState } from "../src/files/journal";

const volume = (): VolumeAwarenessSnapshot => ({
  id: "C:",
  rootPath: "C:\\",
  label: "System",
  driveLetter: "C:",
  fileSystem: "NTFS",
  volumeType: "fixed",
  totalBytes: 1000,
  freeBytes: 500,
  indexedSearchCapable: true,
  ntfsJournalCapable: true,
  watcherHealth: "idle",
  freshness: {
    capturedAt: "2026-04-09T12:00:00.000Z",
    generatedAt: "2026-04-09T12:00:00.000Z",
    observedAt: "2026-04-09T12:00:00.000Z",
    ageMs: 0,
    staleAfterMs: 60000,
    isFresh: true
  }
});

describe("volume journal state", () => {
  it("keeps NTFS volumes on the usn-journal path when journal reads succeed", async () => {
    const state = await refreshVolumeJournalState(
      {
        volumes: [volume()],
        previousCursors: [
          {
            volumeId: "C:",
            rootPath: "C:\\",
            source: "usn-journal",
            cursor: "0x10",
            lastProcessedAt: "2026-04-09T11:00:00.000Z",
            healthy: true
          }
        ],
        observedAt: new Date("2026-04-09T12:00:00.000Z")
      },
      async (script) => {
        if (script.includes("queryjournal")) {
          return {
            ok: true,
            journalId: "0x1",
            firstUsn: "0x0",
            nextUsn: "0x40",
            lowestValidUsn: "0x0",
            maxUsn: "0x999",
            error: null
          };
        }

        return {
          ok: true,
          nextCursor: "0x32",
          lastTimestamp: "2026-04-09T11:59:00.000Z",
          recordCount: 4,
          error: null
        };
      }
    );

    expect(state.journalCursors[0]?.source).toBe("usn-journal");
    expect(state.journalCursors[0]?.cursor).toBe("0x32");
    expect(state.journalCursors[0]?.healthy).toBe(true);
    expect(state.monitor.volumes[0]?.cursorSource).toBe("usn-journal");
    expect(state.monitor.volumes[0]?.watcherHealth).toBe("healthy");
    expect(state.monitor.volumes[0]?.lastSeenChangeAt).toBe("2026-04-09T11:59:00.000Z");
  });

  it("falls back cleanly when journal reads are denied", async () => {
    const state = await refreshVolumeJournalState(
      {
        volumes: [volume()],
        previousCursors: [
          {
            volumeId: "C:",
            rootPath: "C:\\",
            source: "usn-journal",
            cursor: "0x10",
            lastProcessedAt: "2026-04-09T11:00:00.000Z",
            healthy: true
          }
        ],
        observedAt: new Date("2026-04-09T12:00:00.000Z")
      },
      async (script) => {
        if (script.includes("queryjournal")) {
          return {
            ok: true,
            journalId: "0x1",
            firstUsn: "0x0",
            nextUsn: "0x40",
            lowestValidUsn: "0x0",
            maxUsn: "0x999",
            error: null
          };
        }

        return {
          ok: false,
          nextCursor: null,
          lastTimestamp: null,
          recordCount: 0,
          error: "Error 5: Access is denied."
        };
      }
    );

    expect(state.journalCursors[0]?.source).toBe("snapshot-diff");
    expect(state.journalCursors[0]?.healthy).toBe(false);
    expect(state.monitor.volumes[0]?.cursorSource).toBe("snapshot-diff");
    expect(state.monitor.volumes[0]?.watcherHealth).toBe("degraded");
    expect(state.monitor.volumes[0]?.lastError).toContain("Access is denied");
  });
});
