import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChatHeader } from "./ChatHeader";
import { ChatInputBar } from "./ChatInputBar";
import { SmartPromptStatus } from "./SmartPromptStatus";
import { MessageList } from "./MessageList";
import { Button } from "../../../shared/components/Button";
import { AwarenessCard } from "./AwarenessCard";
import { buildStartupDigestCard } from "../utils/awarenessCards";
export function ChatPanel({ conversation, appHealth, messages, messageCount, contextPreview, loading, settings, pendingAssistantId, pendingReasoningTrace, onSendMessage, onNewConversation, onClearChat, onRegenerate, onOpenHistory }) {
    const canRegenerate = messages.some((message) => message.role === "assistant");
    const startupDigest = appHealth?.startupDigest ?? null;
    const showStartupDigest = Boolean(startupDigest) && messages.length === 0;
    return (_jsxs("section", { className: "flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70", children: [_jsx(ChatHeader, { conversation: conversation, messageCount: messageCount }), _jsx(SmartPromptStatus, { preview: contextPreview, appHealth: appHealth }), _jsxs("div", { className: "grid grid-cols-4 gap-1 border-b border-slate-800 px-2 py-1.5", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", onClick: () => void onNewConversation(), children: "New Chat" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", onClick: () => void onClearChat(), children: "Clear" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: !canRegenerate, onClick: () => void onRegenerate(), children: "Regenerate" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", onClick: onOpenHistory, children: "History" })] }), _jsxs("div", { className: "min-h-0 flex-1 px-2 py-1.5", children: [showStartupDigest && startupDigest ? (_jsx("div", { className: "mb-2", children: _jsx(AwarenessCard, { card: buildStartupDigestCard(startupDigest) }) })) : null, _jsx(MessageList, { messages: messages, loading: loading, pendingAssistantId: pendingAssistantId, pendingReasoningTrace: pendingReasoningTrace })] }), _jsx(ChatInputBar, { onSend: onSendMessage, disabled: loading, settings: settings })] }));
}
