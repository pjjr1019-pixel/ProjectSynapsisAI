import { afterEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import {
  buildPromptMessages,
  configureMemoryDatabase,
  createConversationRecord,
  matchPromptBehaviorMemoryRecords,
  upsertPromptBehaviorPreferenceRecord
} from "../src/memory/index.ts";

const createdDbPaths: string[] = [];

const createDbPath = (suffix: string): string => {
  const path = join(tmpdir(), `synai-prompt-behavior-${Date.now()}-${suffix}.json`);
  createdDbPaths.push(path);
  return path;
};

afterEach(async () => {
  await Promise.all(
    createdDbPaths.splice(0).map(async (dbPath) => {
      await rm(dbPath, { force: true });
    })
  );
});

describe("prompt-behavior memory", () => {
  it("upserts and retrieves deterministic prompt-behavior preferences", async () => {
    configureMemoryDatabase(createDbPath("upsert"));
    const conversation = await createConversationRecord();

    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: conversation.id,
      summary: "Prefer docs-only answers with exact labels.",
      preferenceLabel: "docs exact labels",
      matchHints: ["docs only", "exact labels", "section titles"],
      confidence: 0.8,
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "docs-only",
        outputShape: "labeled-sections",
        outputLength: "short",
        preserveExactStructure: true,
        requiredChecks: ["respect-source-scope", "preserve-user-structure"]
      }
    });
    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: conversation.id,
      summary: "Prefer docs-only answers with exact labels.",
      preferenceLabel: "docs exact labels",
      matchHints: ["docs only", "exact labels", "section titles"],
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

    const matched = await matchPromptBehaviorMemoryRecords("Use docs only and exact section labels", {
      intentFamily: "repo-grounded",
      sourceScope: "docs-only"
    });
    expect(matched).toHaveLength(1);
    expect(matched[0].entry.entryKind).toBe("behavior_preference");
    expect(matched[0].entry.resolution.sourceScope).toBe("docs-only");
  });

  it("surfaces prompt-behavior matches inside assembled prompt context", async () => {
    configureMemoryDatabase(createDbPath("context"));
    const conversation = await createConversationRecord();

    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: conversation.id,
      summary: "Break first-time repo tasks into short bullets.",
      preferenceLabel: "first-time repo bullets",
      matchHints: ["first time", "repo", "bullets"],
      confidence: 0.85,
      resolution: {
        intentFamily: "repo-grounded",
        sourceScope: "repo-wide",
        outputShape: "bullets",
        outputLength: "short",
        preserveExactStructure: false,
        requiredChecks: ["respect-source-scope", "decompose-first-time-task"]
      }
    });

    const result = await buildPromptMessages(
      conversation.id,
      "I am new to this repo. Give me setup bullets.",
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

    expect(result.contextPreview.promptBehaviorMemories?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(result.promptMessages[0]?.content).toContain("Prompt behavior memory:");
  });
});
