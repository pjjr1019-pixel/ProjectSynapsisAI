import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../apps/desktop/src/App";

const chatStreamListeners = new Set<(event: { requestId: string; conversationId: string; content: string }) => void>();
const backgroundSyncListeners = new Set<
  (event: {
    conversationId: string;
    conversations: Array<{
      id: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    }>;
    modelStatus: {
      status: "connected" | "disconnected" | "busy" | "error";
      provider: "ollama";
      model: string;
      baseUrl: string;
      checkedAt: string;
      detail?: string;
    };
  }) => void
>();

const getModelHealth = vi
  .fn()
  .mockResolvedValueOnce({
    status: "connected",
    provider: "ollama" as const,
    model: "llama3.2",
    baseUrl: "http://127.0.0.1:11434",
    checkedAt: new Date().toISOString()
  })
  .mockResolvedValueOnce({
    status: "connected",
    provider: "ollama" as const,
    model: "llama3.2",
    baseUrl: "http://127.0.0.1:11434",
    checkedAt: new Date().toISOString()
  });

const mockBridge = {
  getAppHealth: async () => ({ status: "ok", startedAt: new Date().toISOString(), version: "0.1.0" }),
  getModelHealth,
  sendChat: vi.fn(async () => {
    throw new Error("not used");
  }),
  subscribeChatStream: (listener: (event: { requestId: string; conversationId: string; content: string }) => void) => {
    chatStreamListeners.add(listener);
    return () => chatStreamListeners.delete(listener);
  },
  subscribeBackgroundSync: (
    listener: (event: {
      conversationId: string;
      conversations: Array<{
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
      }>;
      modelStatus: {
        status: "connected" | "disconnected" | "busy" | "error";
        provider: "ollama";
        model: string;
        baseUrl: string;
        checkedAt: string;
        detail?: string;
      };
    }) => void
  ) => {
    backgroundSyncListeners.add(listener);
    return () => backgroundSyncListeners.delete(listener);
  },
  createConversation: async () => ({
    conversation: {
      id: "c-1",
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    messages: []
  }),
  listConversations: async () => [
    {
      id: "c-1",
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  loadConversation: async () => ({
    conversation: {
      id: "c-1",
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    messages: []
  }),
  clearConversation: async () => ({
    conversation: {
      id: "c-1",
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    messages: []
  }),
  deleteConversation: async () => {},
  searchMemories: async () => [],
  listMemories: async () => [],
  deleteMemory: async () => {},
  getContextPreview: async () => ({
    systemInstruction: "test",
    stableMemories: [],
    retrievedMemories: [],
    summarySnippet: "",
    recentMessagesCount: 0,
    estimatedChars: 0,
    webSearch: {
      status: "off" as const,
      query: "",
      results: []
    }
  })
};

describe("app-start smoke", () => {
  beforeEach(() => {
    chatStreamListeners.clear();
    backgroundSyncListeners.clear();
    mockBridge.sendChat.mockReset().mockImplementation(async () => {
      throw new Error("not used");
    });
  });

  it("renders the full shell layout", async () => {
    Object.assign(window, { synai: mockBridge });
    const { container } = render(<App />);

    expect(await screen.findByText("SynAI Test Build")).toBeInTheDocument();
    expect(screen.getByText("Smart Local Chat")).toBeInTheDocument();

    const shellMain = container.querySelector("main");
    expect(shellMain).not.toBeNull();
    expect([...shellMain!.children].map((node) => node.tagName)).toEqual([
      "ASIDE",
      "SECTION",
      "ASIDE"
    ]);

    expect(screen.getByText("Staged Features")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search conversations")).toBeInTheDocument();
    expect(screen.getByText("Memory Search")).toBeInTheDocument();
    expect(screen.getByText("Health check updates appear here.")).toBeInTheDocument();
    expect(screen.getByText(/Last checked/)).toBeInTheDocument();
    expect(screen.getByLabelText("Use recent web search")).toBeInTheDocument();
    expect(container.querySelector("footer")).toHaveTextContent("Ready");

    const healthCheckButton = screen.getByRole("button", { name: "Run Health Check" });
    await waitFor(() => expect(healthCheckButton).not.toBeDisabled());
    fireEvent.click(healthCheckButton);

    expect(await screen.findByText(/Health check succeeded at/)).toBeInTheDocument();
    expect(getModelHealth).toHaveBeenCalledTimes(2);
  });

  it("shows optimistic messages and streamed reply content before the final response resolves", async () => {
    let resolveSendChat: ((value: {
      conversation: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
      };
      assistantMessage: {
        id: string;
        conversationId: string;
        role: "assistant";
        content: string;
        createdAt: string;
      };
      messages: Array<{
        id: string;
        conversationId: string;
        role: "user" | "assistant";
        content: string;
        createdAt: string;
      }>;
      contextPreview: {
        systemInstruction: string;
        stableMemories: [];
        retrievedMemories: [];
        summarySnippet: string;
        recentMessagesCount: number;
        estimatedChars: number;
        webSearch: {
          status: "used" | "off";
          query: string;
          results: Array<{
            title: string;
            url: string;
            source: string;
            snippet: string;
            publishedAt: string | null;
          }>;
        };
      };
      modelStatus: {
        status: "connected";
        provider: "ollama";
        model: string;
        baseUrl: string;
        checkedAt: string;
      };
    }) => void) | null = null;

    mockBridge.sendChat.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSendChat = resolve;
        })
    );

    Object.assign(window, { synai: mockBridge });
    render(<App />);

    const input = await screen.findByPlaceholderText("Message local model...");
    fireEvent.click(screen.getByLabelText("Use recent web search"));
    fireEvent.change(input, { target: { value: "hello fast" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(await screen.findByText("hello fast")).toBeInTheDocument();
    await waitFor(() => expect(mockBridge.sendChat).toHaveBeenCalledTimes(1));

    const [{ requestId }] = mockBridge.sendChat.mock.calls[0];
    expect(mockBridge.sendChat.mock.calls[0][0]).toMatchObject({
      text: "hello fast",
      useWebSearch: true
    });
    await act(async () => {
      chatStreamListeners.forEach((listener) =>
        listener({
          requestId,
          conversationId: "c-1",
          content: "hello from stream"
        })
      );
    });

    expect(await screen.findByText("hello from stream")).toBeInTheDocument();

    await act(async () => {
      resolveSendChat?.({
        conversation: {
          id: "c-1",
          title: "hello fast",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        assistantMessage: {
          id: "assistant-1",
          conversationId: "c-1",
          role: "assistant",
          content: "hello from stream and final",
          createdAt: "2026-04-08T01:00:01.456Z"
        },
        messages: [
          {
            id: "user-1",
            conversationId: "c-1",
            role: "user",
            content: "hello fast",
            createdAt: "2026-04-08T01:00:00.123Z"
          },
          {
            id: "assistant-1",
            conversationId: "c-1",
            role: "assistant",
            content: "hello from stream and final",
            createdAt: "2026-04-08T01:00:01.456Z"
          }
        ],
        contextPreview: {
          systemInstruction: "test",
          stableMemories: [],
          retrievedMemories: [],
          summarySnippet: "",
          recentMessagesCount: 2,
          estimatedChars: 12,
          webSearch: {
            status: "used",
            query: "hello fast",
            results: [
              {
                title: "Example source",
                url: "https://example.com/story",
                source: "Example News",
                snippet: "A fresh result.",
                publishedAt: "Wed, 08 Apr 2026 01:00:00 GMT"
              }
            ]
          }
        },
        modelStatus: {
          status: "connected",
          provider: "ollama",
          model: "phi4-mini:latest",
          baseUrl: "http://127.0.0.1:11434",
          checkedAt: new Date().toISOString()
        }
      });
    });

    expect(await screen.findByText("hello from stream and final")).toBeInTheDocument();
    expect(await screen.findByText("Example source")).toBeInTheDocument();
  });
});
