import { jsx as _jsx } from "react/jsx-runtime";
import { MemoryItem } from "./MemoryItem";
export function MemoryList({ items, onDelete, limit }) {
    const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;
    if (visibleItems.length === 0) {
        return _jsx("p", { className: "text-xs text-slate-500", children: "No memory entries yet." });
    }
    return (_jsx("div", { className: "space-y-2", children: visibleItems.map((item) => (_jsx(MemoryItem, { item: item, onDelete: onDelete }, item.id))) }));
}
