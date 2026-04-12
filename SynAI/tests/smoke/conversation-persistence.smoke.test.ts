import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import {
  appendChatMessage,
  configureMemoryDatabase,
  createConversationRecord,
  deleteConversationRecord,
  listConversationRecords,
  loadConversationRecord,
  snapshotDatabase,
  upsertPromptBehaviorPreferenceRecord
} from "../../packages/Awareness-Reasoning/src/memory";

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

  it("deletes only the targeted conversation without wiping other database lanes", async () => {
    const dbPath = join(tmpdir(), `synai-test-${Date.now()}-delete-conversation.json`);
    configureMemoryDatabase(dbPath);

    const doomedConversation = await createConversationRecord();
    const survivingConversation = await createConversationRecord();

    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: survivingConversation.id,
      summary: "Prefer repo-wide bullets for setup replies.",
      preferenceLabel: "repo setup bullets",
      matchHints: ["repo setup", "bullets"],
      confidence: 0.8,
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "repo-wide",
        outputShape: "bullets",
        outputLength: "short",
        preserveExactStructure: false,
        requiredChecks: ["respect-source-scope"]
      }
    });

    await deleteConversationRecord(doomedConversation.id);

    const snapshot = await snapshotDatabase();
    expect(snapshot.conversations.map((conversation) => conversation.id)).toEqual([survivingConversation.id]);
    expect(snapshot.promptBehaviorMemories).toHaveLength(1);
    expect(snapshot.promptBehaviorMemories[0]?.sourceConversationId).toBe(survivingConversation.id);

    await rm(dbPath, { force: true });
  });
});
