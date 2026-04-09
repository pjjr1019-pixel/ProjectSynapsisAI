import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Conversation } from "@contracts";
import { Shell } from "./layout/Shell";
import { WorkspaceTabs } from "./features/local-chat/components/WorkspaceTabs";
import { ChatPanel } from "./features/local-chat/components/ChatPanel";
import { useLocalChat } from "./features/local-chat/hooks/useLocalChat";
import type { WorkspaceTab } from "./features/local-chat/types/localChat.types";
import { buildConversationTurns } from "./features/local-chat/utils/conversationTurns";

// Rec #15: lazy-load secondary tabs — they are never shown on first render
const HistoryPanel = lazy(() =>
  import("./features/local-chat/components/HistoryPanel").then((m) => ({ default: m.HistoryPanel }))
);
const ToolsPanel = lazy(() =>
  import("./features/local-chat/components/ToolsPanel").then((m) => ({ default: m.ToolsPanel }))
);
const SettingsPanel = lazy(() =>
  import("./features/local-chat/components/SettingsPanel").then((m) => ({ default: m.SettingsPanel }))
);

const TabFallback = () => (
  <div className="flex h-full items-center justify-center text-xs text-slate-500">Loading…</div>
);

function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("chat");
  const chat = useLocalChat({ chatVisible: activeTab === "chat" });
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");

  const currentConversation = useMemo<Conversation | null>(() => {
    if (!chat.activeConversationId) {
      return null;
    }

    return chat.conversations.find((conversation) => conversation.id === chat.activeConversationId) ?? null;
  }, [chat.activeConversationId, chat.conversations]);

  const turns = useMemo(() => buildConversationTurns(chat.messages), [chat.messages]);

  useEffect(() => {
    setActiveTurnIndex(null);
  }, [chat.activeConversationId]);

  const openChat = (): void => {
    setActiveTab("chat");
  };

  const openHistory = (): void => {
    setActiveTab("history");
  };

  const sendMessage = async (
    text: string,
    options?: { ragMode?: "inherit" | "on" | "off"; webMode?: "inherit" | "on" | "off"; traceMode?: "inherit" | "on" | "off" }
  ): Promise<void> => {
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
    <Shell appHealth={chat.appHealth} modelHealth={chat.modelHealth} screenStatus={chat.screenStatus} error={chat.error}>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex min-h-0 flex-1 overflow-hidden p-2">
          {activeTab === "chat" ? (
            <ChatPanel
              conversation={currentConversation}
              appHealth={chat.appHealth}
              messages={chat.messages}
              messageCount={chat.messages.length}
              contextPreview={chat.contextPreview}
              loading={chat.loading}
              settings={chat.settings}
              pendingAssistantId={chat.pendingAssistantId}
              pendingReasoningTrace={chat.pendingReasoningTrace}
              onSendMessage={sendMessage}
              onNewConversation={createConversation}
              onClearChat={clearConversation}
              onRegenerate={regenerateReply}
              onOpenHistory={openHistory}
            />
          ) : null}

          {activeTab === "history" ? (
            <Suspense fallback={<TabFallback />}>
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
            </Suspense>
          ) : null}

          {activeTab === "tools" ? (
            <Suspense fallback={<TabFallback />}>
              <ToolsPanel
                settings={chat.settings}
                modelHealth={chat.modelHealth}
                screenStatus={chat.screenStatus}
                loading={chat.loading}
                healthCheckState={chat.healthCheckState}
                healthCheckMessage={chat.healthCheckMessage}
                promptEvaluationRunning={chat.promptEvaluationRunning}
                promptEvaluationResult={chat.promptEvaluationResult}
                promptEvaluationError={chat.promptEvaluationError}
                onRunHealthCheck={chat.refreshModelHealth}
                onNewConversation={createConversation}
                onClearChat={clearConversation}
                onRegenerate={regenerateReply}
                onRefreshMemory={refreshMemory}
                onCopyResponse={chat.copyLastResponse}
                onRunPromptEvaluation={chat.runPromptEvaluation}
                preview={chat.contextPreview}
                memories={chat.memories}
                onStartAssistMode={chat.startAssistMode}
                onStopAssistMode={chat.stopAssistMode}
              />
            </Suspense>
          ) : null}

          {activeTab === "settings" ? (
            <Suspense fallback={<TabFallback />}>
              <SettingsPanel
                settings={chat.settings}
                availableModels={chat.availableModels}
                onUpdateSettings={chat.updateSettings}
              />
            </Suspense>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}

export default App;
