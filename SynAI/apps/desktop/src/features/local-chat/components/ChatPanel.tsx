import type { Conversation, ChatMessage, ContextPreview } from "@contracts";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInputBar } from "./ChatInputBar";
import { SmartPromptStatus } from "./SmartPromptStatus";

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: ChatMessage[];
  contextPreview: ContextPreview | null;
  loading: boolean;
  onSendMessage: (text: string, options?: { useWebSearch?: boolean }) => Promise<void>;
}

export function ChatPanel({
  conversation,
  messages,
  contextPreview,
  loading,
  onSendMessage
}: ChatPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-950/60">
      <ChatHeader conversation={conversation} messageCount={messages.length} />
      <SmartPromptStatus preview={contextPreview} />
      <div className="flex-1 p-4">
        <MessageList messages={messages} loading={loading} />
      </div>
      <ChatInputBar onSend={onSendMessage} disabled={loading} />
    </section>
  );
}
