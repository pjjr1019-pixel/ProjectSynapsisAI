import type { Conversation, ContextPreview } from "@contracts";
import { ChatHeader } from "./ChatHeader";
import { ChatInputBar } from "./ChatInputBar";
import { SmartPromptStatus } from "./SmartPromptStatus";
import type { ConversationTurn } from "../types/localChat.types";
import { Button } from "../../../shared/components/Button";
import { TurnPreview } from "./TurnPreview";

interface ChatPanelProps {
  conversation: Conversation | null;
  messageCount: number;
  latestTurn: ConversationTurn | null;
  contextPreview: ContextPreview | null;
  loading: boolean;
  defaultWebSearch: boolean;
  onSendMessage: (text: string, options?: { useWebSearch?: boolean }) => Promise<void>;
  onNewConversation: () => Promise<void>;
  onClearChat: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onOpenHistory: () => void;
}

export function ChatPanel({
  conversation,
  messageCount,
  latestTurn,
  contextPreview,
  loading,
  defaultWebSearch,
  onSendMessage,
  onNewConversation,
  onClearChat,
  onRegenerate,
  onOpenHistory
}: ChatPanelProps) {
  const canRegenerate = Boolean(latestTurn?.assistant);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <ChatHeader conversation={conversation} messageCount={messageCount} />
      <SmartPromptStatus preview={contextPreview} />
      <div className="grid grid-cols-4 gap-2 border-b border-slate-800 p-2">
        <Button className="py-1 text-[11px]" variant="ghost" onClick={() => void onNewConversation()}>
          New Chat
        </Button>
        <Button className="py-1 text-[11px]" variant="ghost" onClick={() => void onClearChat()}>
          Clear
        </Button>
        <Button
          className="py-1 text-[11px]"
          variant="ghost"
          disabled={!canRegenerate}
          onClick={() => void onRegenerate()}
        >
          Regenerate
        </Button>
        <Button className="py-1 text-[11px]" variant="ghost" onClick={onOpenHistory}>
          History
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <TurnPreview turn={latestTurn} label="Latest turn" />
      </div>
      <ChatInputBar onSend={onSendMessage} disabled={loading} defaultUseWebSearch={defaultWebSearch} />
    </section>
  );
}
