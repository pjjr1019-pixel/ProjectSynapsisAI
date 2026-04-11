import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Badge } from "../../../shared/components/Badge";
import { cn } from "../../../shared/utils/cn";
import { formatDateTime, formatStopwatch, formatTime } from "../../../shared/utils/time";
import { AwarenessCard } from "./AwarenessCard";
import { GroundingEvidenceView } from "./GroundingEvidenceView";
import { ReasoningTraceView } from "./ReasoningTraceView";
const taskDecisionTone = (decision) => {
    if (decision === "allow" || decision === "allow_with_verification") {
        return "good";
    }
    if (decision === "require_approval" || decision === "clarify" || decision === "plan_only") {
        return "warn";
    }
    if (decision === "deny") {
        return "bad";
    }
    return "neutral";
};
export function MessageItem({ message, previousUserAt = null, liveTrace = null }) {
    const isUser = message.role === "user";
    const isLiveUsage = message.role === "assistant" && message.metadata?.awareness?.intentFamily === "live-usage";
    const liveUpdatedAt = message.metadata?.awareness?.lastRefreshedAt ?? null;
    const awarenessCard = message.metadata?.awareness?.card ?? null;
    const ragTraceSummary = message.metadata?.rag?.traceSummary ?? null;
    const grounding = message.metadata?.grounding ?? null;
    const taskState = message.metadata?.task ?? null;
    const sources = message.sources ?? [];
    const replyLatencyMs = !isUser && previousUserAt ? new Date(message.createdAt).getTime() - new Date(previousUserAt).getTime() : null;
    return (_jsxs("article", { className: cn("max-w-[84%] rounded-md border px-2 py-1.5 text-[12px]", isUser
            ? "ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
            : isLiveUsage
                ? "mr-auto border-cyan-500/40 bg-cyan-500/8 text-cyan-50"
                : "mr-auto border-slate-700 bg-slate-900 text-slate-100"), children: [_jsxs("header", { className: "mb-1 flex items-center justify-between gap-2 text-[9px] text-slate-400", children: [_jsxs("span", { children: [isUser ? "You" : message.role === "assistant" ? "Assistant" : "System", " ", isUser ? "Sent" : "Received", " ", formatTime(message.createdAt)] }), !isUser && replyLatencyMs !== null ? _jsxs("span", { children: ["Reply time ", formatStopwatch(replyLatencyMs)] }) : null, isLiveUsage ? (_jsx("span", { className: "rounded-full border border-cyan-400/40 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-cyan-200", children: "Live" })) : null] }), isLiveUsage && liveUpdatedAt ? (_jsxs("p", { className: "mb-1 text-[8px] text-cyan-200/70", children: ["Updated ", formatTime(liveUpdatedAt)] })) : null, !isUser && awarenessCard ? (_jsx("div", { className: "mb-1", children: _jsx(AwarenessCard, { card: awarenessCard, compact: true }) })) : null, !isUser && liveTrace ? (_jsx("div", { className: "mb-1.5", children: _jsx(ReasoningTraceView, { trace: liveTrace, live: true }) })) : null, !isUser && !liveTrace && ragTraceSummary ? (_jsx("div", { className: "mb-1.5", children: _jsx(ReasoningTraceView, { trace: ragTraceSummary }) })) : null, !isUser && taskState ? (_jsxs("div", { className: "mb-1.5 rounded border border-cyan-500/20 bg-cyan-500/5 p-1.5", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx(Badge, { tone: taskDecisionTone(taskState.decision), children: taskState.decision }), _jsx(Badge, { tone: taskState.approvalState.pending ? "warn" : taskState.approvalRequired ? "warn" : "good", children: taskState.approvalState.pending ? "Approval pending" : taskState.approvalRequired ? "Approval gated" : "Approved" }), _jsx(Badge, { tone: taskState.verificationSummary ? "neutral" : "good", children: taskState.recommendedExecutor }), _jsx(Badge, { tone: taskState.gapClass ? "warn" : "good", children: taskState.gapClass ?? taskState.riskTier })] }), _jsx("p", { className: "mt-1 text-[9px] text-cyan-100/80", children: taskState.interpretedIntent }), taskState.executionSummary ? (_jsxs("p", { className: "mt-0.5 text-[9px] text-slate-300", children: ["Execution: ", taskState.executionSummary] })) : null, taskState.reportSummary ? (_jsxs("p", { className: "mt-0.5 text-[9px] text-cyan-200", children: ["Report: ", taskState.reportSummary] })) : null, taskState.verificationSummary ? (_jsxs("p", { className: "mt-0.5 text-[9px] text-slate-300", children: ["Verification: ", taskState.verificationSummary] })) : null, taskState.rollbackSummary ? (_jsxs("p", { className: "mt-0.5 text-[9px] text-slate-300", children: ["Rollback: ", taskState.rollbackSummary] })) : null, taskState.remediationSummary ? (_jsxs("p", { className: "mt-0.5 text-[9px] text-amber-200", children: ["Remediation: ", taskState.remediationSummary] })) : null] })) : null, !isUser && grounding && grounding.claims.length > 0 ? (_jsx("div", { className: "mb-1.5", children: _jsx(GroundingEvidenceView, { grounding: grounding }) })) : null, isUser || (!grounding && !awarenessCard && message.content.trim().length > 0) ? (_jsx("p", { className: cn("whitespace-pre-wrap", isLiveUsage ? "font-mono text-[11px] leading-snug" : "leading-relaxed"), children: message.content })) : null, !isUser && !grounding && sources.length > 0 ? (_jsxs("div", { className: "mt-1.5 space-y-1.5 border-t border-slate-700/70 pt-1.5", children: [_jsx("p", { className: "text-[10px] font-medium uppercase tracking-wide text-slate-400", children: "Sources" }), sources.map((source) => (_jsxs("div", { className: "rounded border border-slate-700/70 bg-slate-950/60 p-1", children: [_jsx("a", { className: "text-[10px] font-medium text-cyan-300 hover:text-cyan-200", href: source.url, target: "_blank", rel: "noreferrer", children: source.title }), _jsxs("p", { className: "mt-0.5 text-[9px] text-slate-500", children: [source.source, source.publishedAt ? ` | ${formatDateTime(source.publishedAt)}` : ""] })] }, `${source.url}-${source.publishedAt ?? "na"}`)))] })) : null] }));
}
