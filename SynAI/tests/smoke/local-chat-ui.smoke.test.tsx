import { fireEvent, render, screen } from "@testing-library/react";
import type { ChatMessage } from "@contracts";
import { ChatPanel } from "../../apps/desktop/src/features/local-chat/components/ChatPanel";

describe("local-chat-ui smoke", () => {
  it("renders messages and sends on Enter", async () => {
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
        createdAt: "2026-04-08T01:00:01.456Z"
      }
    ];
    const onSend = vi.fn(async () => {});

    render(
      <ChatPanel
        conversation={{
          id: "c1",
          title: "Chat 1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }}
        messages={messages}
        contextPreview={null}
        loading={false}
        onSendMessage={onSend}
      />
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText(/Sent .*\.123/)).toBeInTheDocument();
    expect(screen.getByText(/Received .*\.456/)).toBeInTheDocument();
    expect(screen.getByText(/Reply time 00:01\.333/)).toBeInTheDocument();
    expect(screen.getByLabelText("Use recent web search")).not.toBeChecked();
    const input = screen.getByPlaceholderText("Message local model...");
    fireEvent.change(input, { target: { value: "new line" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onSend).toHaveBeenCalledWith("new line", { useWebSearch: false });
  });
});
