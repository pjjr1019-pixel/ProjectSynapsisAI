import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import {
  buildPromptMessages,
  configureMemoryDatabase,
  createConversationRecord,
  matchPromptBehaviorMemoryRecords,
  snapshotDatabase,
  upsertPromptBehaviorPreferenceRecord,
  upsertResolvedPromptPatternRecord
} from "../../packages/Awareness-Reasoning/src/memory/index.ts";

describe("prompt-behavior memory smoke", () => {
  it("stores prompt behavior memories in a separate top-level lane and matches deterministically", async () => {
    const dbPath = join(tmpdir(), `synai-test-${Date.now()}-prompt-behavior.json`);
    configureMemoryDatabase(dbPath);
    const conversation = await createConversationRecord();

    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: conversation.id,
      summary: "User prefers exact three-bullet responses for repo summaries.",
      preferenceLabel: "exact repo bullets",
      matchHints: ["three bullets", "repo summary", "exact format"],
      confidence: 0.8,
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "repo-wide",
        outputShape: "bullets",
        outputLength: "short",
        preserveExactStructure: true,
        requiredChecks: ["respect-source-scope", "preserve-user-structure"]
      }
    });

    await upsertResolvedPromptPatternRecord({
      sourceConversationId: conversation.id,
      summary: "Resolved repo-doc prompt with labeled sections and strict source scope.",
      patternSummary: "repo docs labeled sections",
      matchHints: ["repo docs", "labeled sections"],
      confidence: 0.7,
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "docs-only",
        outputShape: "labeled-sections",
        outputLength: "short",
        preserveExactStructure: true,
        requiredChecks: ["respect-source-scope", "preserve-user-structure"]
      }
    });

    const matches = await matchPromptBehaviorMemoryRecords(
      "Use repo docs and answer with labeled sections",
      {
        intentFamily: "repo-grounded",
        sourceScope: "docs-only"
      }
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].entry.entryKind).toBe("resolved_pattern");

    const db = await snapshotDatabase();
    expect(db.promptBehaviorMemories.length).toBe(2);
    expect(db.memories.length).toBe(0);

    await rm(dbPath, { force: true });
  });

  it("includes matched prompt-behavior memories during prompt assembly", async () => {
    const dbPath = join(tmpdir(), `synai-test-${Date.now()}-prompt-assembly.json`);
    configureMemoryDatabase(dbPath);
    const conversation = await createConversationRecord();

    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: conversation.id,
      summary: "Prefer direct repo-scoped bullets for setup responses.",
      preferenceLabel: "repo setup bullets",
      matchHints: ["repo setup", "bullets", "first time"],
      confidence: 0.9,
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "repo-wide",
        outputShape: "bullets",
        outputLength: "short",
        preserveExactStructure: false,
        requiredChecks: ["respect-source-scope", "decompose-first-time-task"]
      }
    });

    const assembled = await buildPromptMessages(
      conversation.id,
      "I am using this repo for the first time. Give setup bullets.",
      undefined,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      {
        promptIntent: {
          intentFamily: "repo-grounded",
          sourceScope: "repo-wide"
        }
      }
    );

    expect(assembled.contextPreview.promptBehaviorMemories?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(assembled.promptMessages[0]?.content).toContain("Prompt behavior memory:");

    await rm(dbPath, { force: true });
  });
});
