import { useEffect, useMemo, useState } from "react";
import type { Conversation } from "@contracts";
import { Shell } from "./layout/Shell";
import { WorkspaceTabs } from "./features/local-chat/components/WorkspaceTabs";
import { ChatPanel } from "./features/local-chat/components/ChatPanel";
import { HistoryPanel } from "./features/local-chat/components/HistoryPanel";
import { ToolsPanel } from "./features/local-chat/components/ToolsPanel";
import { SettingsPanel } from "./features/local-chat/components/SettingsPanel";
import { useLocalChat } from "./features/local-chat/hooks/useLocalChat";
import type { WorkspaceTab } from "./features/local-chat/types/localChat.types";
import { buildConversationTurns } from "./features/local-chat/utils/conversationTurns";

function App() {
  const chat = useLocalChat();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");

  const currentConversation = useMemo<Conversation | null>(() => {
    if (!chat.activeConversationId) {
      return null;
    }

    return chat.conversations.find((conversation) => conversation.id === chat.activeConversationId) ?? null;
  }, [chat.activeConversationId, chat.conversations]);

  const turns = useMemo(() => buildConversationTurns(chat.messages), [chat.messages]);
  const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  useEffect(() => {
    setActiveTurnIndex(null);
  }, [chat.activeConversationId]);

  const openChat = (): void => {
    setActiveTab("chat");
  };

  const openHistory = (): void => {
    setActiveTab("history");
  };

  const sendMessage = async (text: string, options?: { useWebSearch?: boolean }): Promise<void> => {
    await chat.sendMessage(text, false, options);
    setActiveTurnIndex(null);
  };

  const createConversation = async (): Promise<void> => {
    await chat.createConversation();
    setActiveTab("chat");
    setActiveTurnIndex(null);
    setHistoryQuery("");
  };

  const switchConversation = async (conversationId: string): Promise<void> => {
    await chat.switchConversation(conversationId);
    setActiveTurnIndex(null);
  };

  const clearConversation = async (): Promise<void> => {
    await chat.clearConversation();
    setActiveTurnIndex(null);
  };

  const regenerateReply = async (): Promise<void> => {
    await chat.regenerateLastReply();
    setActiveTurnIndex(null);
  };

  const refreshMemory = async (): Promise<void> => {
    await chat.refreshRetrievedMemory();
  };

  const selectTurn = (index: number): void => {
    setActiveTurnIndex(index);
    setActiveTab("history");
  };

  return (
    <Shell modelHealth={chat.modelHealth} error={chat.error}>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex min-h-0 flex-1 overflow-hidden p-2">
          {activeTab === "chat" ? (
            <ChatPanel
              conversation={currentConversation}
              messageCount={chat.messages.length}
              latestTurn={latestTurn}
              contextPreview={chat.contextPreview}
              loading={chat.loading}
              defaultWebSearch={chat.settings.defaultWebSearch}
              onSendMessage={sendMessage}
              onNewConversation={createConversation}
              onClearChat={clearConversation}
              onRegenerate={regenerateReply}
              onOpenHistory={openHistory}
            />
          ) : null}

          {activeTab === "history" ? (
            <HistoryPanel
              conversations={chat.conversations}
              activeConversationId={chat.activeConversationId}
              onNewConversation={createConversation}
              onSelectConversation={switchConversation}
              onDeleteConversation={chat.deleteConversation}
              onOpenChat={openChat}
              turns={turns}
              activeTurnIndex={activeTurnIndex}
              onSelectTurnIndex={selectTurn}
              onResetTurn={() => setActiveTurnIndex(null)}
              query={historyQuery}
              onQueryChange={setHistoryQuery}
            />
          ) : null}

          {activeTab === "tools" ? (
            <ToolsPanel
              modelHealth={chat.modelHealth}
              loading={chat.loading}
              healthCheckState={chat.healthCheckState}
              healthCheckMessage={chat.healthCheckMessage}
              onRunHealthCheck={chat.refreshModelHealth}
              onNewConversation={createConversation}
              onClearChat={clearConversation}
              onRegenerate={regenerateReply}
              onRefreshMemory={refreshMemory}
              onCopyResponse={chat.copyLastResponse}
              preview={chat.contextPreview}
              memories={chat.memories}
            />
          ) : null}

          {activeTab === "settings" ? (
            <SettingsPanel
              settings={chat.settings}
              availableModels={chat.availableModels}
              onUpdateSettings={chat.updateSettings}
            />
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

export default App;
