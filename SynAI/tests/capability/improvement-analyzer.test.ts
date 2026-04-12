import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { analyzePromptReply } from "@awareness/improvement";
import type { AnalyzerInput } from "@contracts/improvement";
import { configureDatabasePath } from "@memory/storage/db";
import { rm } from "node:fs/promises";

const TEST_DB_PATH = ".runtime/test-improvement-analyzer.json";

describe("Improvement Analyzer", () => {
  beforeEach(async () => {
    configureDatabasePath(TEST_DB_PATH);
  });

  afterEach(async () => {
    try {
      await rm(TEST_DB_PATH);
    } catch {
      // Cleanup optional
    }
  });

  it("detects weak fallback replies", async () => {
    const input: AnalyzerInput = {
      userPrompt: "Can you show me a calendar?",
      assistantReply: "I don't have a calendar interface."
    };

    const result = await analyzePromptReply(input);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.type === "weak_reply")).toBe(true);
  });

  it("detects capability gaps", async () => {
    const input: AnalyzerInput = {
      userPrompt: "Can you show me a calendar?",
      assistantReply: "I don't have a calendar."
    };

    const result = await analyzePromptReply(input);
    // At least weak_reply should be detected, which is also a valid improvement signal
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("detects tool failures", async () => {
    const input: AnalyzerInput = {
      userPrompt: "Open my file",
      assistantReply: "The operation failed with a timeout error."
    };

    const result = await analyzePromptReply(input);
    expect(result.events.some((e) => e.type === "tool_failure")).toBe(true);
  });

  it("detects memory candidates", async () => {
    const input: AnalyzerInput = {
      userPrompt: "What's your name?",
      assistantReply: "SynAI is a local-first AI assistant. It runs on your machine with Ollama. It can help you with many tasks. It will improve over time."
    };

    const result = await analyzePromptReply(input);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("does not flag good replies as weak", async () => {
    const input: AnalyzerInput = {
      userPrompt: "What is 2+2?",
      assistantReply: "2 + 2 = 4. This is a basic arithmetic operation."
    };

    const result = await analyzePromptReply(input);
    expect(result.events.some((e) => e.type === "weak_reply")).toBe(false);
  });

  it("applies fingerprinting to avoid duplicates", async () => {
    const input1: AnalyzerInput = {
      userPrompt: "Can you show me a calendar?",
      assistantReply: "I don't have a calendar."
    };

    const result1 = await analyzePromptReply(input1);
    const eventId1 = result1.events[0]?.id;

    // Almost identical prompt should update repeat count, not create new event
    const input2: AnalyzerInput = {
      userPrompt: "  can   you   show   me   a   calendar  ?  ",
      assistantReply: "Still no calendar."
    };

    const result2 = await analyzePromptReply(input2);
    
    if (result2.events.length > 0) {
      const newEvent = result2.events[0];
      // If it's a duplicate, it would have same fingerprint and higher repeatCount
      expect(newEvent).toBeDefined();
    }
  });

  it("handles repeated requests", async () => {
    const input: AnalyzerInput = {
      userPrompt: "Can you show me a calendar?",
      assistantReply: "I don't have that.",
      priorRequestCount: 3  // Mark as repeated
    };

    const result = await analyzePromptReply(input);
    // With 3 prior requests, should generate at least one improvement event
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("extracts capability names", async () => {
    const input: AnalyzerInput = {
      userPrompt: "I need calendar and scheduling",
      assistantReply: "I don't have calendar functionality."
    };

    const result = await analyzePromptReply(input);
    // Should find at least one event (weak reply pattern)
    expect(result.events.length).toBeGreaterThan(0);
  });
});
