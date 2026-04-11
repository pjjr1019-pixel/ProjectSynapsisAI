import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from "../../../shared/components/Card";
import { useMemory } from "../hooks/useMemory";
import { MemoryList } from "./MemoryList";
import { MemorySearch } from "./MemorySearch";
import { cn } from "../../../shared/utils/cn";
export function MemoryPanel({ className, hideTitle = false, compact = false }) {
    const memory = useMemory();
    const visibleItems = compact ? memory.items.slice(0, 3) : memory.items;
    return (_jsxs(Card, { className: cn("space-y-2 p-3", className), children: [hideTitle ? null : _jsx("h3", { className: "text-sm font-semibold text-slate-100", children: "Memory Search" }), _jsx(MemorySearch, { query: memory.query, onChange: memory.setQuery }), memory.error ? _jsx("p", { className: "text-xs text-rose-300", children: memory.error }) : null, _jsxs("div", { className: "space-y-2", children: [_jsx(MemoryList, { items: visibleItems, onDelete: memory.remove }), compact && memory.items.length > visibleItems.length ? (_jsxs("p", { className: "text-[10px] text-slate-500", children: ["+", memory.items.length - visibleItems.length, " more results"] })) : null] })] }));
}
