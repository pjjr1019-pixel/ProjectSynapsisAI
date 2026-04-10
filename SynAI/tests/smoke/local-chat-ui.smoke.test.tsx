import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ChatMessage } from "@contracts";
import { ChatPanel } from "../../apps/desktop/src/features/local-chat/components/ChatPanel";

describe("local-chat-ui smoke", () => {
  const conversation = {
    id: "c1",
    title: "Chat 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const messages: ChatMessage[] = [
    {
      id: "m1",
      conversationId: "c1",
      role: "user",
      content: "hello",
      createdAt: "2026-04-08T01:00:00.123Z"
    },
    {
      id: "m2",
      conversationId: "c1",
      role: "assistant",
      content: "hi there",
      createdAt: "2026-04-08T01:00:01.456Z",
      metadata: {
        awareness: {
          intentFamily: "live-usage",
          answerMode: "evidence-first",
          query: "what's my cpu usage",
          refreshEveryMs: 2000,
          lastRefreshedAt: "2026-04-08T01:00:02.000Z",
          card: {
            kind: "live-usage",
            title: "Live system usage",
            subtitle: "2026-04-08T01:00:02.000Z",
            metrics: [
              {
                label: "CPU",
                value: "12%"
              }
            ],
            sections: [],
            footer: "medium confidence | grounded grounding"
          }
        }
      },
      sources: [
        {
          title: "Example source",
          url: "https://example.com/story",
          source: "Example News",
          snippet: "Fresh update",
          publishedAt: "Wed, 08 Apr 2026 01:00:00 GMT"
        }
      ]
    }
  ];
  it("renders the scrollable feed, auto-follows by default, and keeps the composer visible", async () => {
    const onSend = vi.fn(async () => {});

    render(
      <ChatPanel
        conversation={conversation}
        appHealth={{
          status: "ok",
          startedAt: "2026-04-08T01:00:00.000Z",
          version: "0.1.0",
          awareness: {
            initializing: false,
            ready: true,
            inFlightTargets: [],
            backgroundSamplerActive: true,
            lastSampledAt: "2026-04-08T01:00:03.000Z"
          },
          startupDigest: null
        }}
        messages={messages}
        messageCount={messages.length}
        contextPreview={null}
        loading={false}
        settings={{
          selectedModel: "phi4-mini:latest",
          defaultWebSearch: false,
          advancedRagEnabled: true,
          workspaceIndexingEnabled: true,
          webInRagEnabled: true,
          liveTraceVisible: false,
          responseMode: "balanced",
          awarenessAnswerMode: "evidence-first"
        }}
        pendingAssistantId={null}
        pendingReasoningTrace={null}
        onSendMessage={onSend}
        onNewConversation={async () => {}}
        onClearChat={async () => {}}
        onRegenerate={async () => {}}
        onOpenHistory={() => {}}
      />
    );

    const log = screen.getByRole("log", { name: "Conversation feed" });
    expect(log).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Jump to latest" })).not.toBeInTheDocument();

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.getByText(/You sent .*\.123/i)).toBeInTheDocument();
    expect(screen.getByText(/Assistant received .*\.456/i)).toBeInTheDocument();
    expect(screen.getByText(/Reply time 00:01\.333/)).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    expect(screen.getByText("Live system usage")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText(/aware ready/i)).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Example source")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
    expect(screen.getByRole("button", { name: "RAG: Default On" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Web: Default Off" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trace: Default Off" })).toBeInTheDocument();

    Object.defineProperty(log, "scrollHeight", { configurable: true, value: 1200 });
    Object.defineProperty(log, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(log, "scrollTop", { configurable: true, value: 0, writable: true });

    fireEvent.scroll(log);

    expect(await screen.findByRole("button", { name: "Jump to latest" })).toBeVisible();

    const input = screen.getByPlaceholderText("Message local model...");
    fireEvent.change(input, { target: { value: "new line" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    });

    expect(onSend).toHaveBeenCalledWith("new line", {
      ragMode: "inherit",
      webMode: "inherit",
      traceMode: "inherit"
    });
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
  });
});
