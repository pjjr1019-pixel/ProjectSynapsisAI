import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import {
  appendChatMessage,
  configureMemoryDatabase,
  createConversationRecord,
  listConversationRecords,
  loadConversationRecord
} from "../../packages/memory/src";

describe("conversation-persistence smoke", () => {
  it("persists conversations and messages across reload", async () => {
    const dbPath = join(tmpdir(), `synai-test-${Date.now()}-persist.json`);
    configureMemoryDatabase(dbPath);

    const conversation = await createConversationRecord();
    await appendChatMessage(conversation.id, "user", "hello");
    await appendChatMessage(conversation.id, "assistant", "hi");

    const listed = await listConversationRecords();
    expect(listed.length).toBe(1);

    configureMemoryDatabase(dbPath);
    const loaded = await loadConversationRecord(conversation.id);
    expect(loaded?.messages.length).toBe(2);
    expect(loaded?.messages[0].content).toBe("hello");

    await rm(dbPath, { force: true });
  });
});
