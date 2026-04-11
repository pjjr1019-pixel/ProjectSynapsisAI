import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "../../../shared/components/Card";
import { cn } from "../../../shared/utils/cn";
export function MemoryInspector({ preview, memories, className, hideTitle = false, compact = false }) {
    const retrieved = preview?.retrievedMemories ?? [];
    const visibleRetrieved = compact ? retrieved.slice(0, 3) : retrieved;
    return (_jsxs(Card, { className: cn("space-y-2 p-3", className), children: [hideTitle ? null : _jsx("h3", { className: "text-sm font-semibold text-slate-100", children: "Memory Inspector" }), _jsxs("p", { className: "text-xs text-slate-400", children: ["Stored memories: ", memories.length] }), _jsxs("div", { className: "space-y-2", children: [visibleRetrieved.length === 0 ? (_jsx("p", { className: "text-xs text-slate-500", children: "No memories retrieved for current turn." })) : (visibleRetrieved.map((item) => (_jsxs("div", { className: "rounded border border-slate-700 bg-slate-900/60 p-2", children: [_jsxs("p", { className: "text-xs text-slate-300", children: ["[", item.memory.category, "] ", item.memory.text] }), _jsxs("p", { className: "text-[11px] text-slate-500", children: ["score ", item.score.toFixed(2), " via ", item.reason] })] }, item.memory.id)))), compact && retrieved.length > visibleRetrieved.length ? (_jsxs("p", { className: "text-[10px] text-slate-500", children: ["+", retrieved.length - visibleRetrieved.length, " more retrieved"] })) : null] })] }));
}
