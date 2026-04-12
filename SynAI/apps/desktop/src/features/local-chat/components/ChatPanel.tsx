import type { AppHealth, ChatMessage, Conversation, ContextPreview, ReasoningTraceState } from "@contracts";
import { ChatHeader } from "./ChatHeader";
import { ChatInputBar } from "./ChatInputBar";
import { SmartPromptStatus } from "./SmartPromptStatus";
import { MessageList } from "./MessageList";
import { Button } from "../../../shared/components/Button";
import { AwarenessCard } from "./AwarenessCard";
import { buildStartupDigestCard } from "../utils/awarenessCards";
import { ImprovementEventsPanel } from "./improvement";
import type { ChatSettingsState } from "../types/localChat.types";

interface ChatPanelProps {
  conversation: Conversation | null;
  appHealth: AppHealth | null;
  messages: ChatMessage[];
  messageCount: number;
  contextPreview: ContextPreview | null;
  loading: boolean;
  settings: ChatSettingsState;
  pendingAssistantId: string | null;
  pendingReasoningTrace: ReasoningTraceState | null;
  onSendMessage: (
    text: string,
    options?: { ragMode?: "inherit" | "on" | "off"; webMode?: "inherit" | "on" | "off"; traceMode?: "inherit" | "on" | "off" }
  ) => Promise<void>;
  onNewConversation: () => Promise<void>;
  onClearChat: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onOpenHistory: () => void;
}

export function ChatPanel({
  conversation,
  appHealth,
  messages,
  messageCount,
  contextPreview,
  loading,
  settings,
  pendingAssistantId,
  pendingReasoningTrace,
  onSendMessage,
  onNewConversation,
  onClearChat,
  onRegenerate,
  onOpenHistory
}: ChatPanelProps) {
  const canRegenerate = messages.some((message) => message.role === "assistant");
  const startupDigest = appHealth?.startupDigest ?? null;
  const showStartupDigest = Boolean(startupDigest) && messages.length === 0;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
      <ChatHeader conversation={conversation} messageCount={messageCount} />
      <SmartPromptStatus preview={contextPreview} appHealth={appHealth} />
      <div className="grid grid-cols-4 gap-1 border-b border-slate-800 px-2 py-1.5">
        <Button className="py-1 text-[10px]" variant="ghost" onClick={() => void onNewConversation()}>
          New Chat
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" onClick={() => void onClearChat()}>
          Clear
        </Button>
        <Button
          className="py-1 text-[10px]"
          variant="ghost"
          disabled={!canRegenerate}
          onClick={() => void onRegenerate()}
        >
          Regenerate
        </Button>
        <Button className="py-1 text-[10px]" variant="ghost" onClick={onOpenHistory}>
          History
        </Button>
      </div>
      <div className="min-h-0 flex-1 px-2 py-1.5">
        {showStartupDigest && startupDigest ? (
          <div className="mb-2">
            <AwarenessCard card={buildStartupDigestCard(startupDigest)} />
          </div>
        ) : null}
        <MessageList
          messages={messages}
          loading={loading}
          pendingAssistantId={pendingAssistantId}
          pendingReasoningTrace={pendingReasoningTrace}
        />
      </div>
      <div className="border-t border-slate-800 px-2 py-1">
        <ImprovementEventsPanel maxEvents={5} />
      </div>
      <ChatInputBar onSend={onSendMessage} disabled={loading} settings={settings} />
    </section>
  );
}
