import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../../../shared/components/Badge";
import { formatStopwatch } from "../../../shared/utils/time";
const stageTone = (status) => {
    switch (status) {
        case "completed":
            return "good";
        case "running":
            return "warn";
        case "error":
            return "bad";
        default:
            return "neutral";
    }
};
export function ReasoningTraceView({ trace, live = false }) {
    const header = (_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wide text-amber-200", children: live ? "Live Reasoning" : "Reasoning Summary" }), _jsxs("p", { className: "text-[10px] text-amber-100/80", children: [trace.mode, " | ", trace.triggerReason, " | ", trace.confidence, " confidence | ", trace.groundedSourceCount, " sources"] })] }), _jsx(Badge, { tone: live ? "warn" : "neutral", children: live ? "Live" : "Saved" })] }));
    const body = (_jsxs("div", { className: "mt-2 space-y-1.5", children: [_jsxs("p", { className: "text-[10px] text-amber-100/70", children: ["Retrieval: memory ", trace.retrieval.memoryKeyword + trace.retrieval.memorySemantic, " | workspace ", trace.retrieval.workspace, " | awareness ", trace.retrieval.awareness, " | web ", trace.retrieval.web, " | ", "total ", trace.retrieval.total] }), trace.grounding ? (_jsxs("p", { className: "text-[10px] text-amber-100/70", children: ["Claims ", trace.grounding.claimCount, " | cited ", Math.round(trace.grounding.citationCoverage * 100), "% | unsupported", " ", trace.grounding.unsupportedClaimCount, " | conflicts ", trace.grounding.conflictedClaimCount] })) : null, _jsx("div", { className: "space-y-1", children: trace.stages.map((stage) => (_jsxs("div", { className: "rounded border border-amber-500/20 bg-black/20 px-2 py-1 text-[10px] text-amber-50/90", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-medium", children: stage.label }), _jsx(Badge, { tone: stageTone(stage.status), children: stage.status })] }), stage.summary ? _jsx("p", { className: "mt-1", children: stage.summary }) : null, _jsxs("p", { className: "mt-1 text-[9px] text-amber-100/60", children: [stage.sourceCount != null ? `${stage.sourceCount} sources` : "No sources", " ", stage.durationMs != null ? `| ${formatStopwatch(stage.durationMs)}` : ""] })] }, stage.id))) })] }));
    return live ? (_jsxs("div", { className: "rounded border border-amber-500/30 bg-amber-500/10 p-2", children: [header, body] })) : (_jsxs("details", { className: "rounded border border-amber-500/20 bg-amber-500/8 p-2", children: [_jsx("summary", { className: "cursor-pointer list-none", children: header }), body] }));
}
