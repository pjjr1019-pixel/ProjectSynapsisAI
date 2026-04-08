import { useEffect } from "react";
import { Shell } from "./layout/Shell";
import { ChatPanel } from "./features/local-chat/components/ChatPanel";
import { ConversationList } from "./features/local-chat/components/ConversationList";
import { LocalModelStatus } from "./features/local-chat/components/LocalModelStatus";
import { MemoryInspector } from "./features/local-chat/components/MemoryInspector";
import { ContextPreview } from "./features/local-chat/components/ContextPreview";
import { ChatControls } from "./features/local-chat/components/ChatControls";
import { useLocalChat } from "./features/local-chat/hooks/useLocalChat";
import { useConversationSearch } from "./features/local-chat/hooks/useConversationSearch";
import { MemoryPanel } from "./features/memory/components/MemoryPanel";

export default function App() {
  const chat = useLocalChat();
  const search = useConversationSearch(chat.conversations);

  useEffect(() => {
    void chat.listMemories();
  }, [chat.messages.length]);

  const activeConversation =
    chat.conversations.find((conversation) => conversation.id === chat.activeConversationId) ?? null;

  return (
    <Shell
      modelHealth={chat.modelHealth}
      error={chat.error}
      sidebar={
        <ConversationList
          conversations={search.filtered}
          activeConversationId={chat.activeConversationId}
          query={search.query}
          onQueryChange={search.setQuery}
          onNewConversation={chat.createConversation}
          onSelectConversation={chat.switchConversation}
          onDeleteConversation={chat.deleteConversation}
        />
      }
      center={
        <ChatPanel
          conversation={activeConversation}
          messages={chat.messages}
          contextPreview={chat.contextPreview}
          loading={chat.loading}
          onSendMessage={(text, options) => chat.sendMessage(text, false, options)}
        />
      }
      right={
        <div className="space-y-3">
          <LocalModelStatus modelHealth={chat.modelHealth} />
          <ChatControls
            loading={chat.loading}
            healthCheckState={chat.healthCheckState}
            healthCheckMessage={chat.healthCheckMessage}
            onRunHealthCheck={chat.refreshModelHealth}
            onNewConversation={chat.createConversation}
            onClearChat={chat.clearConversation}
            onRegenerate={chat.regenerateLastReply}
            onRefreshMemory={chat.refreshRetrievedMemory}
            onCopyResponse={chat.copyLastResponse}
          />
          <MemoryInspector preview={chat.contextPreview} memories={chat.memories} />
          <ContextPreview preview={chat.contextPreview} />
          <MemoryPanel />
        </div>
      }
    />
  );
}
