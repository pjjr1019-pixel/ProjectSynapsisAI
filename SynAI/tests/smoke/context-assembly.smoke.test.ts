import { assembleContext } from "../../packages/Awareness-Reasoning/src/memory/context/assembler";

describe("context-assembly smoke", () => {
  it("assembles context with memory, summary, and recent messages", () => {
    const result = assembleContext({
      systemInstruction: "test system",
      summaryText: "older summary",
      allMessages: [
        {
          id: "1",
          conversationId: "c1",
          role: "user",
          content: "first",
          createdAt: new Date().toISOString()
        },
        {
          id: "2",
          conversationId: "c1",
          role: "assistant",
          content: "second",
          createdAt: new Date().toISOString()
        }
      ],
      stableMemories: [
        {
          id: "m1",
          category: "constraint",
          text: "keep responses short",
          sourceConversationId: "c1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          importance: 0.9,
          archived: false,
          keywords: ["keep", "responses", "short"]
        }
      ],
      retrievedMemories: [],
      webSearch: {
        status: "used",
        query: "iran right now",
        results: [
          {
            title: "Current headline",
            url: "https://example.com/story",
            source: "Example News",
            snippet: "Fresh update",
            publishedAt: "Wed, 08 Apr 2026 01:00:00 GMT"
          }
        ]
      }
    });

    expect(result.promptMessages[0].role).toBe("system");
    expect(result.preview.stableMemories.length).toBe(1);
    expect(result.preview.recentMessagesCount).toBe(2);
    expect(result.preview.webSearch.results.length).toBe(1);
  });
});
