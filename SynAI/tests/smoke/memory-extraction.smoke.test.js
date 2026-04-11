import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import { configureMemoryDatabase, createConversationRecord, extractAndStoreMemories, listMemoryRecords } from "../../packages/Awareness-Reasoning/src/memory";
describe("memory-extraction smoke", () => {
    it("extracts and deduplicates useful memory", async () => {
        const dbPath = join(tmpdir(), `synai-test-${Date.now()}-memory.json`);
        configureMemoryDatabase(dbPath);
        const conversation = await createConversationRecord();
        const text = "I prefer concise replies. We decided to keep all chat local. Important note that we avoid cloud sync.";
        await extractAndStoreMemories(conversation.id, text);
        await extractAndStoreMemories(conversation.id, text);
        const memories = await listMemoryRecords();
        expect(memories.length).toBeGreaterThanOrEqual(2);
        expect(memories.some((memory) => memory.category === "preference")).toBe(true);
        expect(memories.some((memory) => memory.category === "decision")).toBe(true);
        await rm(dbPath, { force: true });
    });
});
