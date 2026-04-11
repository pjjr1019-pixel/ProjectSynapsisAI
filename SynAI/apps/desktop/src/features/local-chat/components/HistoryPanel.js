import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Card } from "../../../shared/components/Card";
import { TurnPreview } from "./TurnPreview";
export function HistoryPanel({ conversations, activeConversationId, onNewConversation, onSelectConversation, onDeleteConversation, onOpenChat, turns, activeTurnIndex, onSelectTurnIndex, onResetTurn, query, onQueryChange }) {
    const currentIndex = turns.length === 0 ? -1 : Math.min(activeTurnIndex ?? turns.length - 1, turns.length - 1);
    const currentTurn = currentIndex >= 0 ? turns[currentIndex] : null;
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex >= 0 && currentIndex < turns.length - 1;
    const normalizedQuery = query.trim().toLowerCase();
    const filteredConversations = normalizedQuery
        ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(normalizedQuery))
        : conversations;
    const selectedConversation = activeConversationId === null
        ? null
        : conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
    const selectConversations = selectedConversation && !filteredConversations.some((conversation) => conversation.id === selectedConversation.id)
        ? [selectedConversation, ...filteredConversations]
        : filteredConversations;
    return (_jsxs("section", { className: "flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60", children: [_jsx("header", { className: "border-b border-slate-800 px-2.5 py-1.5", children: _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold text-slate-100", children: "History" }), _jsx("p", { className: "text-[9px] text-slate-400", children: "Browse conversations and turns without scrolling." })] }), _jsx(Button, { className: "px-2 py-1 text-[10px]", variant: "ghost", onClick: () => void onOpenChat(), children: "Back to Chat" })] }) }), _jsxs("div", { className: "flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2", children: [_jsxs(Card, { className: "space-y-2 p-1.5", children: [_jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-[9px] text-slate-300", children: "Find conversation" }), _jsx(Input, { value: query, placeholder: "Type to filter", onChange: (event) => onQueryChange(event.target.value) })] }), _jsxs("label", { className: "block space-y-1", children: [_jsx("span", { className: "text-[9px] text-slate-300", children: "Conversation" }), _jsxs("select", { className: "w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100", value: activeConversationId ?? "", disabled: selectConversations.length === 0, onChange: (event) => {
                                            if (event.target.value) {
                                                void onSelectConversation(event.target.value);
                                            }
                                        }, children: [selectConversations.length === 0 ? _jsx("option", { value: "", children: "No conversations" }) : null, selectConversations.map((conversation) => (_jsx("option", { value: conversation.id, children: conversation.title }, conversation.id)))] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", onClick: () => void onNewConversation(), children: "New Chat" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", disabled: !activeConversationId, onClick: () => void (activeConversationId ? onDeleteConversation(activeConversationId) : undefined), children: "Delete" }), _jsx(Button, { className: "py-1 text-[10px]", variant: "ghost", onClick: onResetTurn, disabled: turns.length === 0, children: "Latest" })] })] }), _jsxs(Card, { className: "flex min-h-0 flex-1 flex-col gap-1.5 p-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-semibold text-slate-100", children: "Turn Browser" }), _jsx("p", { className: "text-[9px] text-slate-500", children: turns.length === 0 ? "No turns yet." : `Turn ${currentIndex + 1} of ${turns.length}` })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { className: "px-2 py-1 text-[10px]", variant: "ghost", disabled: !canGoBack, onClick: () => onSelectTurnIndex(Math.max(0, currentIndex - 1)), children: "Prev" }), _jsx(Button, { className: "px-2 py-1 text-[10px]", variant: "ghost", disabled: !canGoForward, onClick: () => onSelectTurnIndex(Math.min(turns.length - 1, currentIndex + 1)), children: "Next" })] })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden", children: _jsx(TurnPreview, { turn: currentTurn, label: "Selected turn" }) })] })] })] }));
}
