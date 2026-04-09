import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import {
  appendChatMessage,
  configureMemoryDatabase,
  createConversationRecord,
  getSummary,
  refreshRollingSummary
} from "../../packages/Awareness-Reasoning/src/memory";

describe("rolling-summary smoke", () => {
  it("stores a summary once conversation history exceeds the recent-message window", async () => {
    const dbPath = join(tmpdir(), `synai-test-${Date.now()}-summary.json`);
    configureMemoryDatabase(dbPath);

    const conversation = await createConversationRecord();
    for (let index = 1; index <= 14; index += 1) {
      const role = index % 2 === 0 ? "assistant" : "user";
      await appendChatMessage(conversation.id, role, `${role} turn ${index} about local chat memory`);
    }

    await refreshRollingSummary(conversation.id);

    const summary = await getSummary(conversation.id);
    expect(summary).not.toBeNull();
    expect(summary?.sourceMessageCount).toBe(4);
    expect(summary?.text).toContain("turn 1");
    expect(summary?.text).not.toContain("turn 14");

    await rm(dbPath, { force: true });
  });
});
