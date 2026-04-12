import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../apps/desktop/src/App";
import { localChatStore } from "../../apps/desktop/src/features/local-chat/store/localChatStore";

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

const baseConversation = {
  id: "c-1",
  title: "New conversation",
  createdAt: "2026-04-12T16:00:00.000Z",
  updatedAt: "2026-04-12T16:00:00.000Z"
};

const baseAppHealth = {
  status: "ok" as const,
  startedAt: "2026-04-12T16:00:00.000Z",
  version: "0.1.0",
  awareness: {
    initializing: false,
    ready: true,
    inFlightTargets: [],
    backgroundSamplerActive: true,
    lastSampledAt: "2026-04-12T16:00:03.000Z",
    startupDigestReady: true
  },
  startupDigest: null
};

const baseModelHealth = {
  status: "connected" as const,
  provider: "ollama" as const,
  model: "phi4-mini:latest",
  baseUrl: "http://127.0.0.1:11434",
  checkedAt: "2026-04-12T16:00:02.000Z"
};

const baseContextPreview = {
  reasoningProfile: "chat" as const,
  planningPolicy: null,
  reasoningProfileDiagnostics: null,
  systemInstruction: "test",
  stableMemories: [],
  retrievedMemories: [],
  summarySnippet: "",
  recentMessagesCount: 0,
  estimatedChars: 0,
  fileAwareness: null,
  awarenessQuery: null,
  awarenessAnswerMode: "evidence-first" as const,
  awarenessGrounding: null,
  grounding: null,
  retrievalEval: null,
  runtimePreview: null,
  replyPolicy: null,
  promptIntent: null,
  webSearch: {
    status: "off" as const,
    query: "",
    results: []
  }
};

const baseGovernanceDashboard = {
  capturedAt: "2026-04-12T16:00:04.000Z",
  capabilitySummary: null,
  historyBacklog: null,
  pendingApprovals: [],
  approvalQueue: null,
  recentAuditEntries: [],
  capabilityRegistry: null,
  officialKnowledge: null
};

const baseApprovalQueue = {
  capturedAt: "2026-04-12T16:00:04.000Z",
  totals: {
    total: 0,
    pending: 0,
    approved: 0,
    consumed: 0,
    denied: 0,
    blocked: 0,
    revoked: 0,
    expired: 0
  },
  records: []
};

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createMockBridge(overrides: Partial<Record<string, unknown>> = {}) {
  const bridge = {
    getAppHealth: vi.fn(async () => baseAppHealth),
    getModelHealth: vi.fn(async () => baseModelHealth),
    listAvailableModels: vi.fn(async () => ["phi4-mini:latest", "qwen2.5:3b-instruct-q4_K_M"]),
    sendChat: vi.fn(async (payload: { conversationId: string; text: string }) => {
      const now = "2026-04-12T16:05:00.000Z";
      return {
        conversation: { ...baseConversation, updatedAt: now },
        assistantMessage: {
          id: "a-1",
          conversationId: payload.conversationId,
          role: "assistant" as const,
          content: "Assistant reply from live runtime",
          createdAt: now
        },
        messages: [
          {
            id: "u-1",
            conversationId: payload.conversationId,
            role: "user" as const,
            content: payload.text,
            createdAt: "2026-04-12T16:04:59.000Z"
          },
          {
            id: "a-1",
            conversationId: payload.conversationId,
            role: "assistant" as const,
            content: "Assistant reply from live runtime",
            createdAt: now
          }
        ],
        contextPreview: baseContextPreview,
        modelStatus: baseModelHealth
      };
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
            sourceCount: string | number | null;
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
        modelStatus: typeof baseModelHealth;
      }) => void
    ) => {
      backgroundSyncListeners.add(listener);
      return () => backgroundSyncListeners.delete(listener);
    },
    createConversation: vi.fn(async () => ({
      conversation: baseConversation,
      messages: []
    })),
    listConversations: vi.fn(async () => [baseConversation]),
    loadConversation: vi.fn(async () => ({
      conversation: baseConversation,
      messages: []
    })),
    clearConversation: vi.fn(async () => ({
      conversation: baseConversation,
      messages: []
    })),
    deleteConversation: vi.fn(async () => {}),
    exportConversationHistory: vi.fn(async () => ({ success: true })),
    clearConversationHistory: vi.fn(async () => ({ success: true })),
    searchMemories: vi.fn(async () => []),
    listMemories: vi.fn(async () => []),
    deleteMemory: vi.fn(async () => {}),
    getContextPreview: vi.fn(async () => baseContextPreview),
    getScreenStatus: vi.fn(async () => null),
    getScreenForegroundWindow: vi.fn(async () => null),
    getScreenUiTree: vi.fn(async () => null),
    getScreenLastEvents: vi.fn(async () => []),
    startAssistMode: vi.fn(async () => null),
    stopAssistMode: vi.fn(async () => null),
    runPromptEvaluation: vi.fn(async () => ({
      reportPath: null,
      markdown: "",
      generatedAt: "2026-04-12T16:00:04.000Z",
      cases: []
    })),
    getGovernanceDashboard: vi.fn(async () => baseGovernanceDashboard),
    getGovernanceApprovalQueue: vi.fn(async () => baseApprovalQueue),
    queryGovernanceAudit: vi.fn(async () => []),
    listOfficialKnowledgeSources: vi.fn(async () => []),
    setOfficialKnowledgeSourceEnabled: vi.fn(async () => null),
    refreshOfficialKnowledgeSource: vi.fn(async () => null),
    queryAwareness: vi.fn(async () => null)
  };

  return Object.assign(bridge, overrides);
}

describe("app-start smoke", () => {
  beforeEach(() => {
    localChatStore.resetState();
    window.localStorage.clear();
    chatStreamListeners.clear();
    reasoningTraceListeners.clear();
    backgroundSyncListeners.clear();
    delete (window as Partial<Window> & { require?: unknown }).require;
  });

  it("renders the futuristic boot shell and progresses into the live chat surface", async () => {
    const appHealthDeferred = createDeferred<typeof baseAppHealth>();
    const modelHealthDeferred = createDeferred<typeof baseModelHealth>();
    const bridge = createMockBridge({
      getAppHealth: vi.fn(() => appHealthDeferred.promise),
      getModelHealth: vi.fn(() => modelHealthDeferred.promise)
    });

    Object.assign(window, { synai: bridge });
    render(<App />);

    expect(await screen.findByText("Activation Sequence")).toBeInTheDocument();
    expect(screen.getByText("Renderer shell")).toBeInTheDocument();
    expect(screen.getByText("Typed preload bridge")).toBeInTheDocument();

    appHealthDeferred.resolve(baseAppHealth);
    modelHealthDeferred.resolve(baseModelHealth);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Conversation Core" })).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Message the live local runtime...")).toBeVisible();
    expect(screen.getByText("The loading experience is now the chat surface.")).toBeInTheDocument();
  });

  it("sends chat through the existing bridge and renders the assistant response", async () => {
    const bridge = createMockBridge();
    Object.assign(window, { synai: bridge });

    render(<App />);

    const input = await screen.findByPlaceholderText("Message the live local runtime...");
    fireEvent.change(input, { target: { value: "hello runtime" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    });

    expect(bridge.sendChat).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "c-1",
        text: "hello runtime"
      })
    );
    expect(await screen.findByText("Assistant reply from live runtime")).toBeInTheDocument();
    expect(screen.getByText("hello runtime")).toBeInTheDocument();
  });

  it("opens the legacy settings surface from the new shell without renderer-side privileged globals", async () => {
    const bridge = createMockBridge();
    Object.assign(window, { synai: bridge });

    expect((window as Partial<Window> & { require?: unknown }).require).toBeUndefined();

    render(<App />);

    await screen.findByPlaceholderText("Message the live local runtime...");
    fireEvent.click(screen.getByRole("button", { name: "Open legacy settings" }));

    expect(await screen.findByRole("dialog", { name: "Legacy AI surface" })).toBeInTheDocument();
    expect(screen.getByText("Legacy Settings")).toBeInTheDocument();
    expect(await screen.findByText("Default model")).toBeInTheDocument();
    expect(screen.getByText("Feature Stages")).toBeInTheDocument();
  });
});
