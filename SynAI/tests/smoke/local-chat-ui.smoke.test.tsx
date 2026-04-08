import { act, fireEvent, render, screen } from "@testing-library/react";
import { ChatPanel } from "../../apps/desktop/src/features/local-chat/components/ChatPanel";
import type { ConversationTurn } from "../../apps/desktop/src/features/local-chat/types/localChat.types";

describe("local-chat-ui smoke", () => {
  it("renders the latest turn and keeps the composer visible", async () => {
    const latestTurn: ConversationTurn = {
      index: 0,
      user: {
        id: "m1",
        conversationId: "c1",
        role: "user",
        content: "hello",
        createdAt: "2026-04-08T01:00:00.123Z"
      },
      assistant: {
        id: "m2",
        conversationId: "c1",
        role: "assistant",
        content: "hi there",
        createdAt: "2026-04-08T01:00:01.456Z",
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
    };
    const onSend = vi.fn(async () => {});

    render(
      <ChatPanel
        conversation={{
          id: "c1",
          title: "Chat 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }}
        messageCount={2}
        latestTurn={latestTurn}
        contextPreview={null}
        loading={false}
        defaultWebSearch={false}
        onSendMessage={onSend}
        onNewConversation={async () => {}}
        onClearChat={async () => {}}
        onRegenerate={async () => {}}
        onOpenHistory={() => {}}
      />
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText(/You sent .*\.123/i)).toBeInTheDocument();
    expect(screen.getByText(/Assistant received .*\.456/i)).toBeInTheDocument();
    expect(screen.getByText(/Reply time 00:01\.333/)).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Example source")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
    expect(screen.getByLabelText("Use recent web search")).not.toBeChecked();

    const input = screen.getByPlaceholderText("Message local model...");
    fireEvent.change(input, { target: { value: "new line" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    });

    expect(onSend).toHaveBeenCalledWith("new line", { useWebSearch: false });
    expect(screen.getByPlaceholderText("Message local model...")).toBeVisible();
  });
});
