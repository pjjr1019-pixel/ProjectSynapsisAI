import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../../../shared/utils/cn";
const toneClass = (tone) => {
    switch (tone) {
        case "good":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
        case "warn":
            return "border-amber-500/30 bg-amber-500/10 text-amber-100";
        case "bad":
            return "border-rose-500/30 bg-rose-500/10 text-rose-100";
        default:
            return "border-slate-700/70 bg-slate-950/70 text-slate-100";
    }
};
export function AwarenessCard({ card, compact = false }) {
    return (_jsxs("section", { className: "rounded-md border border-slate-800/80 bg-slate-950/70 p-2", children: [_jsxs("header", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "truncate text-[11px] font-semibold text-slate-100", children: card.title }), card.subtitle ? _jsx("p", { className: "mt-0.5 text-[10px] text-slate-400", children: card.subtitle }) : null] }), _jsx("span", { className: "rounded-full border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-cyan-200", children: card.kind.replace(/-/g, " ") })] }), card.metrics.length > 0 ? (_jsx("div", { className: cn("mt-2 grid gap-1", compact ? "grid-cols-2" : "grid-cols-2"), children: card.metrics.map((metric) => (_jsxs("div", { className: cn("rounded border px-1.5 py-1", toneClass(metric.tone)), children: [_jsx("div", { className: "text-[9px] uppercase tracking-wide text-slate-400", children: metric.label }), _jsx("div", { className: "mt-0.5 text-[11px] font-medium text-inherit", children: metric.value })] }, `${card.kind}-${metric.label}`))) })) : null, card.sections.length > 0 ? (_jsx("div", { className: "mt-2 space-y-1.5", children: card.sections.map((section) => (_jsxs("div", { children: [_jsx("p", { className: "text-[9px] font-medium uppercase tracking-wide text-slate-500", children: section.label }), _jsx("ul", { className: "mt-0.5 space-y-0.5 text-[11px] leading-snug text-slate-200", children: section.items.slice(0, compact ? 3 : 5).map((item) => (_jsx("li", { className: "truncate", children: item }, item))) })] }, `${card.kind}-${section.label}`))) })) : null, card.footer ? _jsx("p", { className: "mt-2 text-[10px] text-slate-400", children: card.footer }) : null] }));
}
