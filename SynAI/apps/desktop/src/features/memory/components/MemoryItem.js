import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "../../../shared/components/Button";
export function MemoryItem({ item, onDelete }) {
    return (_jsxs("article", { className: "rounded border border-slate-700 bg-slate-900/60 p-2", children: [_jsx("p", { className: "text-xs text-slate-400", children: item.category }), _jsx("p", { className: "text-sm text-slate-200", children: item.text }), _jsxs("p", { className: "text-[11px] text-slate-500", children: ["importance ", item.importance.toFixed(2)] }), _jsx(Button, { className: "mt-2 w-full", variant: "ghost", onClick: () => void onDelete(item.id), children: "Delete" })] }));
}
