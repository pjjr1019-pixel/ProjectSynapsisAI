import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import {
  configureMemoryDatabase,
  searchMemoryRecords,
  upsertMemory
} from "../../packages/memory/src";

describe("memory-search smoke", () => {
  it("finds memories by keyword", async () => {
    const dbPath = join(tmpdir(), `synai-test-${Date.now()}-search.json`);
    configureMemoryDatabase(dbPath);

    await upsertMemory({
      category: "project",
      text: "Build a local smart chat testing app",
      sourceConversationId: "c1",
      importance: 0.8
    });
    await upsertMemory({
      category: "preference",
      text: "Prefer compact UI controls",
      sourceConversationId: "c1",
      importance: 0.7
    });

    const found = await searchMemoryRecords("smart chat");
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found[0].text.toLowerCase()).toContain("smart");

    await rm(dbPath, { force: true });
  });
});
