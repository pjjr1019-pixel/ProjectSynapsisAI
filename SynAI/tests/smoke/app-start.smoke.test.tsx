import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../apps/desktop/src/App";

const chatStreamListeners = new Set<(event: { requestId: string; conversationId: string; content: string }) => void>();
const reasoningTraceListeners = new Set<
  (event: {
    requestId: string;
    conversationId: string;
    trace: {
      requestId: string;
      conversationId: string;
      mode: "fast" | "advanced";
      triggerReason: string;
      visible: boolean;
      startedAt: string;
      completedAt: string | null;
      confidence: "low" | "medium" | "high";
      retrieval: {
        memoryKeyword: number;
        memorySemantic: number;
        workspace: number;
        awareness: number;
        web: number;
        total: number;
      };
      groundedSourceCount: number;
      stages: Array<{
        id: string;
        label: string;
        status: "pending" | "running" | "completed" | "skipped" | "error";
        startedAt: string | null;
        endedAt: string | null;
        durationMs: number | null;
        summary: string | null;
        detail: string | null;
        sourceCount: number | null;
      }>;
    };
  }) => void
>();
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

const getModelHealth = vi.fn(async (modelOverride?: string) => ({
  status: "connected",
  provider: "ollama" as const,
  model: modelOverride ?? "phi4-mini:latest",
  baseUrl: "http://127.0.0.1:11434",
  checkedAt: new Date().toISOString()
}));

const listAvailableModels = vi.fn(async () => ["phi4-mini:latest", "qwen2.5:3b-instruct-q4_K_M"]);

const mockBridge = {
  getAppHealth: async () => ({ status: "ok", startedAt: new Date().toISOString(), version: "0.1.0" }),
  getModelHealth,
  listAvailableModels,
  sendChat: vi.fn(async () => {
    throw new Error("not used");
  }),
  subscribeChatStream: (listener: (event: { requestId: string; conversationId: string; content: string }) => void) => {
    chatStreamListeners.add(listener);
    return () => chatStreamListeners.delete(listener);
  },
  subscribeReasoningTrace: (
    listener: (event: {
      requestId: string;
      conversationId: string;
      trace: {
        requestId: string;
        conversationId: string;
        mode: "fast" | "advanced";
        triggerReason: string;
        visible: boolean;
        startedAt: string;
        completedAt: string | null;
        confidence: "low" | "medium" | "high";
        retrieval: {
          memoryKeyword: number;
          memorySemantic: number;
          workspace: number;
          awareness: number;
          web: number;
          total: number;
        };
        groundedSourceCount: number;
        stages: Array<{
          id: string;
          label: string;
          status: "pending" | "running" | "completed" | "skipped" | "error";
          startedAt: string | null;
          endedAt: string | null;
          durationMs: number | null;
          summary: string | null;
          detail: string | null;
          sourceCount: number | null;
        }>;
      };
    }) => void
  ) => {
    reasoningTraceListeners.add(listener);
    return () => reasoningTraceListeners.delete(listener);
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
    window.localStorage.clear();
    chatStreamListeners.clear();
    reasoningTraceListeners.clear();
    backgroundSyncListeners.clear();
    getModelHealth.mockClear();
    listAvailableModels.mockClear();
    mockBridge.sendChat.mockReset().mockImplementation(async () => {
      throw new Error("not used");
    });
  });

  it("renders the compact tabbed workspace and keeps the composer available", async () => {
    Object.assign(window, { synai: mockBridge });
    const { container } = render(<App />);

    expect(await screen.findByText("SynAI Test Build")).toBeInTheDocument();
    expect(screen.getByText("Smart Local Chat")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tools" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();

    const shellMain = container.querySelector("main");
    expect(shellMain).not.toBeNull();
    expect([...shellMain!.children].map((node) => node.tagName)).toEqual(["DIV"]);
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(await screen.findByText("Find conversation")).toBeInTheDocument();
    expect(screen.getByText("Turn Browser")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Tools" }));
    expect(await screen.findByText("Local Model")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Actions" }));
    expect(await screen.findByText("Desktop Actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suggest Action" })).toBeInTheDocument();
    expect(await screen.findByText("Run Health Check")).toBeInTheDocument();
    expect(screen.getByText("Chat Controls")).toBeInTheDocument();

    const healthCheckButton = screen.getByRole("button", { name: "Run Health Check" });
    await waitFor(() => expect(healthCheckButton).not.toBeDisabled());
    fireEvent.click(healthCheckButton);
    expect(await screen.findByText(/Health check succeeded at/)).toBeInTheDocument();
    expect(getModelHealth).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(await screen.findByText("Default model")).toBeInTheDocument();
    expect(screen.getByLabelText("Use recent web search by default")).toBeInTheDocument();
    expect(screen.getByText("Feature Stages")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
    expect(container.querySelector("footer")).toHaveTextContent("Ready");
  });

  it("shows optimistic messages and streamed reply content before the final response resolves", async () => {
    let resolveSendChat:
      | ((
          value: {
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
              sources?: Array<{
                title: string;
                url: string;
                source: string;
                snippet: string;
                publishedAt: string | null;
              }>;
            };
            messages: Array<{
              id: string;
              conversationId: string;
              role: "user" | "assistant";
              content: string;
              createdAt: string;
              sources?: Array<{
                title: string;
                url: string;
                source: string;
                snippet: string;
                publishedAt: string | null;
              }>;
            }>;
            contextPreview: {
              systemInstruction: string;
              stableMemories: [];
              retrievedMemories: [];
              summarySnippet: string;
              recentMessagesCount: number;
              estimatedChars: number;
              awarenessAnswerMode?: "evidence-first" | "llm-primary" | null;
              awarenessGrounding?: {
                status: "grounded" | "partial" | "weak";
                confidenceLevel: "low" | "medium" | "high";
                isFresh: boolean;
                ageMs: number;
                traceCount: number;
              } | null;
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
          }
        ) => void)
      | null = null;

    mockBridge.sendChat.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSendChat = resolve;
        })
    );

    window.localStorage.setItem(
      "synai.chat.settings",
      JSON.stringify({
        selectedModel: "qwen2.5:3b-instruct-q4_K_M",
        defaultWebSearch: true,
        advancedRagEnabled: true,
        workspaceIndexingEnabled: true,
        webInRagEnabled: true,
        liveTraceVisible: false,
        responseMode: "smart",
        awarenessAnswerMode: "llm-primary"
      })
    );

    Object.assign(window, { synai: mockBridge });
    render(<App />);

    fireEvent.click(await screen.findByRole("tab", { name: "Settings" }));
    expect(await screen.findByDisplayValue("qwen2.5:3b-instruct-q4_K_M")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Smart")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    expect(await screen.findByRole("button", { name: "Web: Default On" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RAG: Default On" })).toBeInTheDocument();
    const input = await screen.findByPlaceholderText("Message local model...");
    expect(input).toBeVisible();

    fireEvent.change(input, { target: { value: "hello fast" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(await screen.findByText("hello fast")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
    await waitFor(() => expect(mockBridge.sendChat).toHaveBeenCalledTimes(1));
    expect(getModelHealth).toHaveBeenCalledWith("qwen2.5:3b-instruct-q4_K_M");

    const [{ requestId }] = mockBridge.sendChat.mock.calls[0];
    expect(mockBridge.sendChat.mock.calls[0][0]).toMatchObject({
      text: "hello fast",
      modelOverride: "qwen2.5:3b-instruct-q4_K_M",
      responseMode: "smart",
      awarenessAnswerMode: "llm-primary",
      ragOptions: {
        enabled: "inherit",
        useWeb: "inherit",
        showTrace: "inherit",
        defaultEnabled: true,
        defaultUseWeb: true,
        defaultShowTrace: false,
        workspaceIndexingEnabled: true
      }
    });
    await act(async () => {
      reasoningTraceListeners.forEach((listener) =>
        listener({
          requestId,
          conversationId: "c-1",
          trace: {
            requestId,
            conversationId: "c-1",
            mode: "advanced",
            triggerReason: "auto-complexity",
            visible: true,
            startedAt: "2026-04-08T01:00:00.500Z",
            completedAt: null,
            confidence: "medium",
            retrieval: {
              memoryKeyword: 1,
              memorySemantic: 1,
              workspace: 2,
              awareness: 1,
              web: 0,
              total: 5
            },
            groundedSourceCount: 5,
            stages: [
              {
                id: "route",
                label: "Route",
                status: "completed",
                startedAt: "2026-04-08T01:00:00.500Z",
                endedAt: "2026-04-08T01:00:00.600Z",
                durationMs: 100,
                summary: "advanced path",
                detail: null,
                sourceCount: 0
              },
              {
                id: "synthesize",
                label: "Synthesize",
                status: "running",
                startedAt: "2026-04-08T01:00:00.700Z",
                endedAt: null,
                durationMs: null,
                summary: "Building reply",
                detail: null,
                sourceCount: 5
              }
            ]
          }
        })
      );
    });

    expect(await screen.findByText("Live Reasoning")).toBeInTheDocument();
    expect(screen.getByText(/advanced \| auto-complexity/i)).toBeInTheDocument();
    expect(screen.getByText("Synthesize")).toBeInTheDocument();
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
          createdAt: "2026-04-08T01:00:01.456Z",
          sources: [
            {
              title: "Example source",
              url: "https://example.com/story",
              source: "Example News",
              snippet: "A fresh result.",
              publishedAt: "Wed, 08 Apr 2026 01:00:00 GMT"
            }
          ]
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
            createdAt: "2026-04-08T01:00:01.456Z",
            sources: [
              {
                title: "Example source",
                url: "https://example.com/story",
                source: "Example News",
                snippet: "A fresh result.",
                publishedAt: "Wed, 08 Apr 2026 01:00:00 GMT"
              }
            ]
          }
        ],
        contextPreview: {
          systemInstruction: "test",
          stableMemories: [],
          retrievedMemories: [],
          summarySnippet: "",
          recentMessagesCount: 2,
          estimatedChars: 12,
          awarenessAnswerMode: "llm-primary",
          awarenessGrounding: {
            status: "partial",
            confidenceLevel: "medium",
            isFresh: true,
            ageMs: 24,
            traceCount: 3
          },
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
    expect(await screen.findByText(/mode llm-primary/i)).toBeInTheDocument();
    expect(await screen.findByText(/grounding partial\/medium/i)).toBeInTheDocument();
    expect(await screen.findByText("Sources")).toBeInTheDocument();
    expect((await screen.findAllByText("Example source")).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
  });

  it("persists the awareness answer mode as a global chat setting", async () => {
    Object.assign(window, { synai: mockBridge });
    render(<App />);

    fireEvent.click(await screen.findByRole("tab", { name: "Settings" }));
    const awarenessModeSelect = (await screen.findByDisplayValue("Evidence-first")) as HTMLSelectElement;
    expect(awarenessModeSelect.value).toBe("evidence-first");

    fireEvent.change(awarenessModeSelect, { target: { value: "llm-primary" } });
    await waitFor(() => {
      const raw = window.localStorage.getItem("synai.chat.settings");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? "{}") as { awarenessAnswerMode?: string };
      expect(parsed.awarenessAnswerMode).toBe("llm-primary");
    });
  });
});
