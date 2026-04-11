import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Shell } from "./layout/Shell";
import { WorkspaceTabs } from "./features/local-chat/components/WorkspaceTabs";
import { ChatPanel } from "./features/local-chat/components/ChatPanel";
import { useLocalChat } from "./features/local-chat/hooks/useLocalChat";
import { buildConversationTurns } from "./features/local-chat/utils/conversationTurns";
// Rec #15: lazy-load secondary tabs — they are never shown on first render
const HistoryPanel = lazy(() => import("./features/local-chat/components/HistoryPanel").then((m) => ({ default: m.HistoryPanel })));
const ToolsPanel = lazy(() => import("./features/local-chat/components/ToolsPanel").then((m) => ({ default: m.ToolsPanel })));
const SettingsPanel = lazy(() => import("./features/local-chat/components/SettingsPanel").then((m) => ({ default: m.SettingsPanel })));
const TabFallback = () => (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-slate-500", children: "Loading\u2026" }));
function App() {
    const [activeTab, setActiveTab] = useState("chat");
    const chat = useLocalChat({ chatVisible: activeTab === "chat" });
    const [activeTurnIndex, setActiveTurnIndex] = useState(null);
    const [historyQuery, setHistoryQuery] = useState("");
    const currentConversation = useMemo(() => {
        if (!chat.activeConversationId) {
            return null;
        }
        return chat.conversations.find((conversation) => conversation.id === chat.activeConversationId) ?? null;
    }, [chat.activeConversationId, chat.conversations]);
    const turns = useMemo(() => buildConversationTurns(chat.messages), [chat.messages]);
    useEffect(() => {
        setActiveTurnIndex(null);
    }, [chat.activeConversationId]);
    const openChat = () => {
        setActiveTab("chat");
    };
    const openHistory = () => {
        setActiveTab("history");
    };
    const sendMessage = async (text, options) => {
        await chat.sendMessage(text, false, options);
        setActiveTurnIndex(null);
    };
    const createConversation = async () => {
        await chat.createConversation();
        setActiveTab("chat");
        setActiveTurnIndex(null);
        setHistoryQuery("");
    };
    const switchConversation = async (conversationId) => {
        await chat.switchConversation(conversationId);
        setActiveTurnIndex(null);
    };
    const clearConversation = async () => {
        await chat.clearConversation();
        setActiveTurnIndex(null);
    };
    const regenerateReply = async () => {
        await chat.regenerateLastReply();
        setActiveTurnIndex(null);
    };
    const refreshMemory = async () => {
        await chat.refreshRetrievedMemory();
    };
    const selectTurn = (index) => {
        setActiveTurnIndex(index);
        setActiveTab("history");
    };
    return (_jsx(Shell, { appHealth: chat.appHealth, modelHealth: chat.modelHealth, screenStatus: chat.screenStatus, error: chat.error, children: _jsxs("div", { className: "flex h-full min-h-0 w-full flex-col overflow-hidden", children: [_jsx(WorkspaceTabs, { activeTab: activeTab, onChange: setActiveTab }), _jsxs("div", { className: "flex min-h-0 flex-1 overflow-hidden p-2", children: [activeTab === "chat" ? (_jsx(ChatPanel, { conversation: currentConversation, appHealth: chat.appHealth, messages: chat.messages, messageCount: chat.messages.length, contextPreview: chat.contextPreview, loading: chat.loading, settings: chat.settings, pendingAssistantId: chat.pendingAssistantId, pendingReasoningTrace: chat.pendingReasoningTrace, onSendMessage: sendMessage, onNewConversation: createConversation, onClearChat: clearConversation, onRegenerate: regenerateReply, onOpenHistory: openHistory })) : null, activeTab === "history" ? (_jsx(Suspense, { fallback: _jsx(TabFallback, {}), children: _jsx(HistoryPanel, { conversations: chat.conversations, activeConversationId: chat.activeConversationId, onNewConversation: createConversation, onSelectConversation: switchConversation, onDeleteConversation: chat.deleteConversation, onOpenChat: openChat, turns: turns, activeTurnIndex: activeTurnIndex, onSelectTurnIndex: selectTurn, onResetTurn: () => setActiveTurnIndex(null), query: historyQuery, onQueryChange: setHistoryQuery }) })) : null, activeTab === "tools" ? (_jsx(Suspense, { fallback: _jsx(TabFallback, {}), children: _jsx(ToolsPanel, { settings: chat.settings, modelHealth: chat.modelHealth, screenStatus: chat.screenStatus, loading: chat.loading, healthCheckState: chat.healthCheckState, healthCheckMessage: chat.healthCheckMessage, promptEvaluationRunning: chat.promptEvaluationRunning, promptEvaluationResult: chat.promptEvaluationResult, promptEvaluationError: chat.promptEvaluationError, onRunHealthCheck: chat.refreshModelHealth, onNewConversation: createConversation, onClearChat: clearConversation, onRegenerate: regenerateReply, onRefreshMemory: refreshMemory, onCopyResponse: chat.copyLastResponse, onRunPromptEvaluation: chat.runPromptEvaluation, preview: chat.contextPreview, memories: chat.memories, onStartAssistMode: chat.startAssistMode, onStopAssistMode: chat.stopAssistMode }) })) : null, activeTab === "settings" ? (_jsx(Suspense, { fallback: _jsx(TabFallback, {}), children: _jsx(SettingsPanel, { settings: chat.settings, availableModels: chat.availableModels, onUpdateSettings: chat.updateSettings }) })) : null] })] }) }));
}
export default App;
