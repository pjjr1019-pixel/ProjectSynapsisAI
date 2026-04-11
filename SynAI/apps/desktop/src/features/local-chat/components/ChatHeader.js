import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../../../shared/components/Badge";
export function ChatHeader({ conversation, messageCount }) {
    return (_jsx("header", { className: "border-b border-slate-800 px-2.5 py-1.5", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "truncate text-sm font-semibold text-slate-100", children: conversation?.title ?? "No conversation selected" }), _jsx("p", { className: "text-[10px] text-slate-400", children: "Local chat with memory and web context." })] }), _jsxs(Badge, { className: "px-1.5 py-0.5 text-[10px]", children: [messageCount, " msgs"] })] }) }));
}
