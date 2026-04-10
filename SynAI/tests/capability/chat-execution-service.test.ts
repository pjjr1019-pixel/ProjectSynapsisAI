import { describe, expect, it } from "vitest";
import { createChatExecutionService } from "@governance-execution";
import type { ChatMessage } from "@contracts";

const messages: ChatMessage[] = [
  {
    id: "1",
    conversationId: "c",
    role: "user",
    createdAt: "2026-04-09T00:00:00.000Z",
    content: "hello"
  }
];

describe("chat execution service", () => {
  it("delegates chat and stream calls through provider", async () => {
    const service = createChatExecutionService({
      provider: {
        checkHealth: async () => ({
          status: "connected",
          provider: "ollama",
          model: "test",
          baseUrl: "http://localhost",
          checkedAt: "2026-04-09T00:00:00.000Z"
        }),
        chat: async () => "plain-result",
        chatStream: async (_messages, onChunk) => {
          onChunk("stream-result");
          return "stream-result";
        }
      }
    });

    const plain = await service.runChat(messages);
    expect(plain).toBe("plain-result");

    let streamed = "";
    const streamedResult = await service.runChatStream(messages, (chunk) => {
      streamed = chunk;
    });
    expect(streamedResult).toBe("stream-result");
    expect(streamed).toBe("stream-result");
  });

  it("times out when provider does not return in time", async () => {
    const service = createChatExecutionService({
      provider: {
        checkHealth: async () => ({
          status: "connected",
          provider: "ollama",
          model: "test",
          baseUrl: "http://localhost",
          checkedAt: "2026-04-09T00:00:00.000Z"
        }),
        chat: async () =>
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("late"), 50);
          }),
        chatStream: async () => ""
      }
    });

    await expect(service.runChat(messages, { timeoutMs: 10, label: "timeout-check" })).rejects.toThrow(
      /timed out/i
    );
  });
});
