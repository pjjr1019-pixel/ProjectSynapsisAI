import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Badge } from "../../../shared/components/Badge";
import { formatDateTime } from "../../../shared/utils/time";
const statusTone = (status) => {
    switch (status) {
        case "inference":
            return "warn";
        case "conflicted":
        case "unsupported":
            return "bad";
        default:
            return "neutral";
    }
};
const kindLabel = (kind) => {
    switch (kind) {
        case "memory":
            return "Memory";
        case "workspace":
            return "Workspace";
        case "awareness":
            return "Awareness";
        case "official":
            return "Official";
        case "web":
            return "Web";
        default:
            return kind;
    }
};
const sourceLocator = (source) => {
    if (source.path && source.lineStart != null && source.lineEnd != null) {
        return `${source.path}:${source.lineStart}-${source.lineEnd}`;
    }
    if (source.path) {
        return source.path;
    }
    if (source.url) {
        return source.url;
    }
    return null;
};
export function GroundingEvidenceView({ grounding }) {
    const sourceNumberMap = new Map(grounding.sources.map((source, index) => [source.id, index + 1]));
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "rounded border border-cyan-500/20 bg-cyan-500/5 p-2 text-[10px] text-cyan-100/80", children: _jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsxs("span", { className: "font-medium text-cyan-100", children: ["Grounded answer | ", grounding.summary.overallConfidence, " confidence"] }), _jsxs(Badge, { tone: "neutral", children: [grounding.summary.claimCount, " claims"] }), _jsxs(Badge, { tone: grounding.summary.citationCoverage === 1 ? "good" : "warn", children: [Math.round(grounding.summary.citationCoverage * 100), "% cited"] }), grounding.summary.unsupportedClaimCount > 0 ? (_jsxs(Badge, { tone: "bad", children: [grounding.summary.unsupportedClaimCount, " unsupported"] })) : null, grounding.summary.conflictedClaimCount > 0 ? (_jsxs(Badge, { tone: "bad", children: [grounding.summary.conflictedClaimCount, " conflicts"] })) : null] }) }), _jsx("div", { className: "space-y-1.5", children: grounding.claims.map((claim) => (_jsxs("div", { className: "rounded border border-slate-700/80 bg-slate-950/60 p-2", children: [_jsx("p", { className: "leading-relaxed text-slate-100", children: claim.text }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-1", children: [claim.sourceIds.map((sourceId) => {
                                    const sourceNumber = sourceNumberMap.get(sourceId);
                                    if (!sourceNumber) {
                                        return null;
                                    }
                                    return (_jsxs(Badge, { tone: "neutral", children: ["S", sourceNumber] }, sourceId));
                                }), claim.status !== "grounded" ? (_jsx(Badge, { tone: statusTone(claim.status), children: claim.status === "inference"
                                        ? "Inference"
                                        : claim.status === "conflicted"
                                            ? "Conflict"
                                            : "Unsupported" })) : null] })] }, claim.id))) }), _jsxs("details", { className: "rounded border border-slate-700/80 bg-slate-950/50 p-2", children: [_jsx("summary", { className: "cursor-pointer list-none text-[10px] font-medium uppercase tracking-wide text-slate-300", children: "Evidence" }), _jsxs("div", { className: "mt-2 space-y-2", children: [grounding.conflicts.length > 0 ? (_jsxs("div", { className: "rounded border border-rose-500/20 bg-rose-500/5 p-2", children: [_jsx("p", { className: "text-[10px] font-medium uppercase tracking-wide text-rose-200", children: "Conflict Summary" }), _jsx("div", { className: "mt-1 space-y-1", children: grounding.conflicts.map((conflict) => (_jsx("p", { className: "text-[10px] text-rose-100/90", children: conflict.description }, conflict.id))) })] })) : null, _jsx("div", { className: "space-y-1.5", children: grounding.sources.map((source, index) => (_jsxs("div", { className: "rounded border border-slate-700/70 bg-black/20 p-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsxs(Badge, { tone: "neutral", children: ["S", index + 1] }), _jsx(Badge, { tone: "neutral", children: kindLabel(source.kind) }), source.freshness ? (_jsx(Badge, { tone: source.freshness.isFresh ? "good" : "warn", children: source.freshness.isFresh ? "Fresh" : "Stale" })) : null] }), _jsx("p", { className: "mt-1 text-[11px] font-medium text-slate-100", children: source.title }), _jsx("p", { className: "mt-0.5 text-[10px] text-slate-400", children: source.label }), _jsx("p", { className: "mt-1 text-[11px] text-slate-300", children: source.excerpt }), sourceLocator(source) ? (_jsx("p", { className: "mt-1 text-[10px] text-slate-500", children: sourceLocator(source) })) : null, source.url ? (_jsx("a", { className: "mt-1 inline-block text-[10px] text-cyan-300 hover:text-cyan-200", href: source.url, target: "_blank", rel: "noreferrer", children: "Open source" })) : null, source.freshness ? (_jsxs("p", { className: "mt-1 text-[10px] text-slate-500", children: ["Captured ", formatDateTime(source.freshness.capturedAt)] })) : null] }, source.id))) })] })] })] }));
}
