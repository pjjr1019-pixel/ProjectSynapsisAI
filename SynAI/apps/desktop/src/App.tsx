import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { AppHealth, Conversation, ModelHealth, ScreenAwarenessStatus } from "@contracts";
import { WorkspaceTabs } from "./features/local-chat/components/WorkspaceTabs";
import { ChatPanel } from "./features/local-chat/components/ChatPanel";
import { FuturisticBootToChatShell } from "./features/local-chat/components/FuturisticBootToChatShell";
import { useLocalChat } from "./features/local-chat/hooks/useLocalChat";
import type { ConversationTurn, HealthCheckState, WorkspaceTab } from "./features/local-chat/types/localChat.types";
import { buildConversationTurns } from "./features/local-chat/utils/conversationTurns";

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
  <div className="flex h-full items-center justify-center text-xs text-slate-500">Loading...</div>
);

const surfaceTitles: Record<WorkspaceTab, string> = {
  chat: "Legacy Chat",
  history: "Legacy History",
  tools: "Legacy Controls",
  settings: "Legacy Settings"
};

type LocalChatViewModel = ReturnType<typeof useLocalChat>;

function RuntimeBadge({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-3 py-2",
        tone === "good"
          ? "border-cyan-400/20 bg-cyan-400/[0.06]"
          : tone === "warn"
            ? "border-amber-400/20 bg-amber-400/[0.06]"
            : tone === "bad"
              ? "border-rose-400/20 bg-rose-400/[0.06]"
              : "border-white/8 bg-white/[0.03]"
      ].join(" ")}
    >
      <p className="text-[10px] uppercase tracking-[0.26em] text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-white/90">{value}</p>
    </div>
  );
}

function LegacyWorkspaceDrawer({
  open,
  activeTab,
  onChange,
  onClose,
  currentConversation,
  appHealth,
  modelHealth,
  screenStatus,
  error,
  messages,
  settings,
  availableModels,
  loading,
  pendingAssistantId,
  pendingReasoningTrace,
  contextPreview,
  healthCheckState,
  healthCheckMessage,
  promptEvaluationRunning,
  promptEvaluationResult,
  promptEvaluationError,
  conversations,
  activeConversationId,
  turns,
  activeTurnIndex,
  historyQuery,
  memories,
  onSelectTurn,
  onResetTurn,
  onHistoryQueryChange,
  onNewConversation,
  onClearConversation,
  onRegenerate,
  onRefreshMemory,
  onOpenHistory,
  onOpenChat,
  onSwitchConversation,
  onDeleteConversation,
  onSendMessage,
  onUpdateSettings,
  onRunHealthCheck,
  onCopyResponse,
  onRunPromptEvaluation,
  onStartAssistMode,
  onStopAssistMode
}: {
  open: boolean;
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  onClose: () => void;
  currentConversation: Conversation | null;
  appHealth: AppHealth | null;
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
  error: string | null;
  messages: Parameters<typeof ChatPanel>[0]["messages"];
  settings: Parameters<typeof ChatPanel>[0]["settings"];
  availableModels: string[];
  loading: boolean;
  pendingAssistantId: string | null;
  pendingReasoningTrace: Parameters<typeof ChatPanel>[0]["pendingReasoningTrace"];
  contextPreview: Parameters<typeof ChatPanel>[0]["contextPreview"];
  healthCheckState: HealthCheckState;
  healthCheckMessage: string | null;
  promptEvaluationRunning: boolean;
  promptEvaluationResult: LocalChatViewModel["promptEvaluationResult"];
  promptEvaluationError: string | null;
  conversations: LocalChatViewModel["conversations"];
  activeConversationId: string | null;
  turns: ConversationTurn[];
  activeTurnIndex: number | null;
  historyQuery: string;
  memories: LocalChatViewModel["memories"];
  onSelectTurn: (index: number) => void;
  onResetTurn: () => void;
  onHistoryQueryChange: (value: string) => void;
  onNewConversation: () => Promise<void>;
  onClearConversation: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onRefreshMemory: () => Promise<void>;
  onOpenHistory: () => void;
  onOpenChat: () => void;
  onSwitchConversation: (conversationId: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onSendMessage: Parameters<typeof ChatPanel>[0]["onSendMessage"];
  onUpdateSettings: LocalChatViewModel["updateSettings"];
  onRunHealthCheck: () => Promise<void>;
  onCopyResponse: () => Promise<void>;
  onRunPromptEvaluation: LocalChatViewModel["runPromptEvaluation"];
  onStartAssistMode: LocalChatViewModel["startAssistMode"];
  onStopAssistMode: LocalChatViewModel["stopAssistMode"];
}) {
  if (!open) {
    return null;
  }

  const providerSummary = modelHealth ? `${modelHealth.provider} / ${modelHealth.model}` : "Provider pending";
  const runtimeSummary = appHealth?.awareness?.ready
    ? "Awareness ready"
    : appHealth?.awareness?.initializing
      ? "Awareness initializing"
      : "Runtime warming";
  const assistSummary = screenStatus?.assistMode.enabled ? "Assist on" : "Assist off";

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        aria-label="Close legacy drawer"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Legacy AI surface"
        className="absolute inset-y-0 right-0 z-50 flex w-full max-w-[580px] flex-col border-l border-white/10 bg-slate-950/96 shadow-[-24px_0_70px_rgba(0,0,0,0.45)]"
      >
        <header className="border-b border-white/10 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-200/55">Legacy Surface</p>
              <h2 className="mt-1 truncate text-base font-semibold text-white/92">{surfaceTitles[activeTab]}</h2>
              <p className="mt-1 text-xs text-white/45">
                Existing chat, tools, history, and settings panels remain wired to the same runtime.
              </p>
            </div>
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/72 transition hover:bg-white/[0.08] hover:text-white"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <RuntimeBadge
              label="provider"
              value={providerSummary}
              tone={modelHealth?.status === "connected" ? "good" : modelHealth?.status === "busy" ? "warn" : modelHealth ? "bad" : "neutral"}
            />
            <RuntimeBadge label="runtime" value={runtimeSummary} tone={appHealth?.awareness?.ready ? "good" : "warn"} />
            <RuntimeBadge label="assist" value={assistSummary} tone={screenStatus?.assistMode.enabled ? "good" : "neutral"} />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col p-4">
          <WorkspaceTabs activeTab={activeTab} onChange={onChange} />

          <div className="mt-3 min-h-0 flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <ChatPanel
                conversation={currentConversation}
                appHealth={appHealth}
                messages={messages}
                messageCount={messages.length}
                contextPreview={contextPreview}
                loading={loading}
                settings={settings}
                pendingAssistantId={pendingAssistantId}
                pendingReasoningTrace={pendingReasoningTrace}
                onSendMessage={onSendMessage}
                onNewConversation={onNewConversation}
                onClearChat={onClearConversation}
                onRegenerate={onRegenerate}
                onOpenHistory={onOpenHistory}
              />
            ) : null}

            {activeTab === "history" ? (
              <Suspense fallback={<TabFallback />}>
                <HistoryPanel
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onNewConversation={onNewConversation}
                  onSelectConversation={onSwitchConversation}
                  onDeleteConversation={onDeleteConversation}
                  onOpenChat={onOpenChat}
                  turns={turns}
                  activeTurnIndex={activeTurnIndex}
                  onSelectTurnIndex={onSelectTurn}
                  onResetTurn={onResetTurn}
                  query={historyQuery}
                  onQueryChange={onHistoryQueryChange}
                />
              </Suspense>
            ) : null}

            {activeTab === "tools" ? (
              <Suspense fallback={<TabFallback />}>
                <ToolsPanel
                  settings={settings}
                  modelHealth={modelHealth}
                  screenStatus={screenStatus}
                  loading={loading}
                  healthCheckState={healthCheckState}
                  healthCheckMessage={healthCheckMessage}
                  promptEvaluationRunning={promptEvaluationRunning}
                  promptEvaluationResult={promptEvaluationResult}
                  promptEvaluationError={promptEvaluationError}
                  onRunHealthCheck={onRunHealthCheck}
                  onNewConversation={onNewConversation}
                  onClearChat={onClearConversation}
                  onRegenerate={onRegenerate}
                  onRefreshMemory={onRefreshMemory}
                  onCopyResponse={onCopyResponse}
                  onRunPromptEvaluation={onRunPromptEvaluation}
                  preview={contextPreview}
                  memories={memories}
                  onStartAssistMode={onStartAssistMode}
                  onStopAssistMode={onStopAssistMode}
                />
              </Suspense>
            ) : null}

            {activeTab === "settings" ? (
              <Suspense fallback={<TabFallback />}>
                <SettingsPanel
                  settings={settings}
                  availableModels={availableModels}
                  onUpdateSettings={onUpdateSettings}
                />
              </Suspense>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function App() {
  const [legacyTab, setLegacyTab] = useState<WorkspaceTab>("chat");
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const chat = useLocalChat({ chatVisible: true });

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

  const openLegacySurface = (tab: WorkspaceTab): void => {
    setLegacyTab(tab);
    setLegacyOpen(true);
  };

  const closeLegacySurface = (): void => {
    setLegacyOpen(false);
  };

  const openChat = (): void => {
    setLegacyTab("chat");
  };

  const openHistory = (): void => {
    setLegacyTab("history");
  };

  const sendMessage = async (
    text: string,
    options?: {
      ragMode?: "inherit" | "on" | "off";
      webMode?: "inherit" | "on" | "off";
      traceMode?: "inherit" | "on" | "off";
      codingMode?: "inherit" | "on" | "off";
      highQualityMode?: "inherit" | "on" | "off";
    }
  ): Promise<void> => {
    await chat.sendMessage(text, false, options);
    setActiveTurnIndex(null);
  };

  const createConversation = async (): Promise<void> => {
    await chat.createConversation();
    setLegacyTab("chat");
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
    setLegacyTab("history");
    setLegacyOpen(true);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <FuturisticBootToChatShell
        conversation={currentConversation}
        conversationsCount={chat.conversations.length}
        activeConversationId={chat.activeConversationId}
        appHealth={chat.appHealth}
        modelHealth={chat.modelHealth}
        screenStatus={chat.screenStatus}
        messages={chat.messages}
        loading={chat.loading}
        pendingAssistantId={chat.pendingAssistantId}
        pendingReasoningTrace={chat.pendingReasoningTrace}
        settings={chat.settings}
        error={chat.error}
        onSendMessage={sendMessage}
        onNewConversation={createConversation}
        onClearConversation={clearConversation}
        onRegenerate={regenerateReply}
        onOpenLegacySurface={openLegacySurface}
      />

      <LegacyWorkspaceDrawer
        open={legacyOpen}
        activeTab={legacyTab}
        onChange={setLegacyTab}
        onClose={closeLegacySurface}
        currentConversation={currentConversation}
        appHealth={chat.appHealth}
        modelHealth={chat.modelHealth}
        screenStatus={chat.screenStatus}
        error={chat.error}
        messages={chat.messages}
        settings={chat.settings}
        availableModels={chat.availableModels}
        loading={chat.loading}
        pendingAssistantId={chat.pendingAssistantId}
        pendingReasoningTrace={chat.pendingReasoningTrace}
        contextPreview={chat.contextPreview}
        healthCheckState={chat.healthCheckState}
        healthCheckMessage={chat.healthCheckMessage}
        promptEvaluationRunning={chat.promptEvaluationRunning}
        promptEvaluationResult={chat.promptEvaluationResult}
        promptEvaluationError={chat.promptEvaluationError}
        conversations={chat.conversations}
        activeConversationId={chat.activeConversationId}
        turns={turns}
        activeTurnIndex={activeTurnIndex}
        historyQuery={historyQuery}
        memories={chat.memories}
        onSelectTurn={selectTurn}
        onResetTurn={() => setActiveTurnIndex(null)}
        onHistoryQueryChange={setHistoryQuery}
        onNewConversation={createConversation}
        onClearConversation={clearConversation}
        onRegenerate={regenerateReply}
        onRefreshMemory={refreshMemory}
        onOpenHistory={openHistory}
        onOpenChat={openChat}
        onSwitchConversation={switchConversation}
        onDeleteConversation={chat.deleteConversation}
        onSendMessage={sendMessage}
        onUpdateSettings={chat.updateSettings}
        onRunHealthCheck={chat.refreshModelHealth}
        onCopyResponse={chat.copyLastResponse}
        onRunPromptEvaluation={chat.runPromptEvaluation}
        onStartAssistMode={chat.startAssistMode}
        onStopAssistMode={chat.stopAssistMode}
      />
    </div>
  );
}

export default App;
