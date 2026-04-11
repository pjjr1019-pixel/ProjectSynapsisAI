import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../utils/cn";
export function CompactSection({ title, summary, children, defaultOpen = false, className, ...props }) {
    return (_jsxs("details", { open: defaultOpen, className: cn("rounded-lg border border-slate-800 bg-slate-900/70", className), ...props, children: [_jsxs("summary", { className: "flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-100", children: title }), summary ? _jsx("p", { className: "mt-0.5 truncate text-[11px] text-slate-500", children: summary }) : null] }), _jsx("span", { className: "text-[11px] uppercase tracking-wide text-slate-500", children: "Toggle" })] }), _jsx("div", { className: "border-t border-slate-800 px-3 py-2", children: children })] }));
}
