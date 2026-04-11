import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Panel } from "../../../shared/components/Panel";
import { formatDateTime } from "../../../shared/utils/time";
export function ConversationList(props) {
    const { conversations, activeConversationId, query, onQueryChange, onNewConversation, onSelectConversation, onDeleteConversation } = props;
    return (_jsxs(Panel, { className: "flex h-full flex-col gap-2 p-2", children: [_jsx(Button, { className: "py-1", onClick: () => void onNewConversation(), children: "New Chat" }), _jsx(Input, { className: "py-1", value: query, placeholder: "Search conversations", onChange: (event) => onQueryChange(event.target.value) }), _jsx("div", { className: "flex-1 space-y-2 overflow-y-auto", children: conversations.map((conversation) => (_jsxs("div", { className: `rounded border p-2 ${conversation.id === activeConversationId
                        ? "border-cyan-400/50 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-900/50"}`, children: [_jsxs("button", { className: "w-full text-left", onClick: () => void onSelectConversation(conversation.id), children: [_jsx("p", { className: "truncate text-[13px] text-slate-100", children: conversation.title }), _jsx("p", { className: "mt-0.5 text-[10px] text-slate-500", children: formatDateTime(conversation.updatedAt) })] }), _jsx(Button, { className: "mt-2 w-full py-1", variant: "ghost", onClick: () => void onDeleteConversation(conversation.id), children: "Delete" })] }, conversation.id))) })] }));
}
