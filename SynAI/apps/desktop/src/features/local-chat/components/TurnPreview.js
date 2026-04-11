import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDateTime, formatStopwatch, formatTime } from "../../../shared/utils/time";
const clampStyle = (lines) => ({
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines,
    overflow: "hidden"
});
const SourcePreview = ({ title, source, publishedAt }) => (_jsxs("div", { className: "rounded border border-slate-700/70 bg-slate-950/60 p-1", children: [_jsx("p", { className: "text-[9px] font-medium text-cyan-300", children: title }), _jsxs("p", { className: "mt-0.5 text-[8px] text-slate-500", children: [source, publishedAt ? ` | ${formatDateTime(publishedAt)}` : ""] })] }));
export function TurnPreview({ turn, label, compact = true }) {
    if (!turn || (!turn.user && !turn.assistant)) {
        return (_jsx("div", { className: "rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-[9px] text-slate-400", children: "No messages yet. Send a prompt to start the conversation." }));
    }
    const replyLatencyMs = turn.user && turn.assistant
        ? Math.max(0, new Date(turn.assistant.createdAt).getTime() - new Date(turn.user.createdAt).getTime())
        : null;
    const userLines = compact ? 2 : 4;
    const assistantLines = compact ? 3 : 5;
    const sources = turn.assistant?.sources ?? [];
    return (_jsxs("div", { className: "space-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-[8px] text-slate-400", children: [_jsx("span", { children: label }), turn.assistant ? (_jsx("span", { children: replyLatencyMs !== null ? `Reply time ${formatStopwatch(replyLatencyMs)}` : formatTime(turn.assistant.createdAt) })) : null] }), turn.user ? (_jsxs("div", { className: "rounded-md border border-cyan-500/30 bg-cyan-500/10 p-1", children: [_jsxs("p", { className: "text-[8px] text-slate-400", children: ["You sent ", formatTime(turn.user.createdAt)] }), _jsx("p", { className: "mt-0.5 text-[11px] leading-snug text-cyan-100", style: clampStyle(userLines), children: turn.user.content })] })) : null, turn.assistant ? (_jsxs("div", { className: "rounded-md border border-slate-700 bg-slate-950/70 p-1", children: [_jsxs("p", { className: "text-[8px] text-slate-400", children: ["Assistant received ", formatTime(turn.assistant.createdAt)] }), _jsx("p", { className: "mt-0.5 text-[11px] leading-snug text-slate-100", style: clampStyle(assistantLines), children: turn.assistant.content }), sources.length > 0 ? (_jsxs("div", { className: "mt-1 space-y-1", children: [_jsx("p", { className: "text-[8px] uppercase tracking-wide text-slate-500", children: "Sources" }), _jsx("div", { className: "grid gap-1", children: sources.slice(0, compact ? 2 : 4).map((source) => (_jsx("a", { className: "block rounded border border-slate-700/70 bg-slate-950/60 p-1 hover:border-cyan-400/40", href: source.url, target: "_blank", rel: "noreferrer", children: _jsx(SourcePreview, { title: source.title, source: source.source, publishedAt: source.publishedAt }) }, `${source.url}-${source.publishedAt ?? "na"}`))) }), compact && sources.length > 2 ? (_jsxs("p", { className: "text-[8px] text-slate-500", children: ["+", sources.length - 2, " more sources"] })) : null] })) : null] })) : (_jsx("div", { className: "rounded-md border border-slate-700 bg-slate-950/70 p-1 text-[9px] text-slate-400", children: "Waiting for the assistant reply." }))] }));
}
