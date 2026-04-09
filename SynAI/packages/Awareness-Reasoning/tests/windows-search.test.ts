import { describe, expect, it } from "vitest";
import { queryWindowsIndexedEntries } from "../src/files/windows-search";

describe("windows indexed file search", () => {
  it("maps Windows Search hits into compact file and media entries", async () => {
    const result = await queryWindowsIndexedEntries("holiday video", {
      mode: "media",
      volumeRoots: ["C:\\"],
      now: new Date("2026-04-09T12:00:00.000Z"),
      executor: async () => [
        {
          itemPath: "C:\\Users\\test\\Videos\\clip.mp4",
          fileName: "clip.mp4",
          sizeBytes: 1024,
          modifiedAt: "2026-04-09T11:58:00.000Z",
          fileExtension: ".mp4",
          kind: "video"
        }
      ]
    });

    expect(result?.source).toBe("windows-search");
    expect(result?.files).toHaveLength(1);
    expect(result?.files[0]?.path).toBe("C:\\Users\\test\\Videos\\clip.mp4");
    expect(result?.files[0]?.mediaKind).toBe("video");
    expect(result?.media).toHaveLength(1);
    expect(result?.media[0]?.tags).toContain("video");
  });

  it("filters protected paths out of indexed results", async () => {
    const result = await queryWindowsIndexedEntries("pagefile", {
      volumeRoots: ["C:\\"],
      now: new Date("2026-04-09T12:00:00.000Z"),
      executor: async () => [
        {
          itemPath: "C:\\pagefile.sys",
          fileName: "pagefile.sys",
          sizeBytes: 1024,
          modifiedAt: "2026-04-09T11:58:00.000Z",
          fileExtension: ".sys",
          kind: "system"
        }
      ]
    });

    expect(result).toBeNull();
  });
});
