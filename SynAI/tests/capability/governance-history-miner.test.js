import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm, access } from "node:fs/promises";
import { appendChatMessage, configureMemoryDatabase, createConversationRecord } from "../../packages/Awareness-Reasoning/src/memory";
import { mineGovernedHistory } from "../../packages/Awareness-Reasoning/src/governance-history/miner";
describe("governance history miner", () => {
    it("groups repeated failed tasks and writes candidate cards", async () => {
        const root = join(tmpdir(), `synai-test-${Date.now()}-history`);
        const dbPath = join(root, "memory.json");
        const artifactsRoot = join(root, "artifacts");
        configureMemoryDatabase(dbPath);
        const conversationOne = await createConversationRecord();
        await appendChatMessage(conversationOne.id, "user", "Close Chrome safely.");
        await appendChatMessage(conversationOne.id, "assistant", "I cannot do that right now. Need approval.");
        const conversationTwo = await createConversationRecord();
        await appendChatMessage(conversationTwo.id, "user", "Close Chrome safely.");
        await appendChatMessage(conversationTwo.id, "assistant", "I cannot do that right now. Need approval.");
        const conversationThree = await createConversationRecord();
        await appendChatMessage(conversationThree.id, "user", "open cmd");
        await appendChatMessage(conversationThree.id, "assistant", "I tried but the launch failed.");
        await appendChatMessage(conversationThree.id, "user", "didn't work");
        const result = await mineGovernedHistory({
            artifactsRoot,
            maxFindings: 10
        });
        expect(result.findings.length).toBe(2);
        expect(result.findings[0].repeated_request_count).toBe(2);
        expect(result.findings[0].suggested_executor).toBe("desktop-actions");
        expect(result.groupedCardDrafts.length).toBe(2);
        expect(result.findings.some((finding) => finding.latest_failure_feedback === "didn't work")).toBe(true);
        await access(join(artifactsRoot, "governance-history", "candidate-cards.json"));
        await rm(root, { recursive: true, force: true });
    });
});
