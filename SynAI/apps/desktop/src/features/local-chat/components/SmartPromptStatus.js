import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../../../shared/components/Badge";
import { summarizePromptContext } from "../utils/promptAssembler";
export function SmartPromptStatus({ preview, appHealth = null }) {
    const webTone = preview?.webSearch.status === "used"
        ? "good"
        : preview?.webSearch.status === "error"
            ? "bad"
            : preview?.webSearch.status === "no_results"
                ? "warn"
                : "neutral";
    const awarenessTone = preview?.awareness ? "good" : "neutral";
    const queryTone = preview?.awarenessQuery ? "good" : "neutral";
    const assistTone = preview?.screenAwareness ? "good" : "neutral";
    const ragTone = preview?.rag?.mode === "advanced" ? "good" : preview?.rag ? "warn" : "neutral";
    const modeTone = preview?.awarenessAnswerMode === "evidence-first"
        ? "good"
        : preview?.awarenessAnswerMode === "llm-primary"
            ? "warn"
            : "neutral";
    const awarenessRuntime = appHealth?.awareness ?? null;
    const runtimeTone = awarenessRuntime?.ready ? "good" : awarenessRuntime?.initializing ? "warn" : "neutral";
    const runtimeSummary = awarenessRuntime
        ? [
            awarenessRuntime.ready ? "aware ready" : awarenessRuntime.initializing ? "aware init" : "aware idle",
            awarenessRuntime.backgroundSamplerActive ? "sampler on" : "sampler off",
            awarenessRuntime.inFlightTargets.length > 0
                ? `in flight ${awarenessRuntime.inFlightTargets.join(", ")}`
                : "in flight none",
            awarenessRuntime.lastSampledAt ? `sample ${awarenessRuntime.lastSampledAt.slice(11, 19)}` : null
        ]
            .filter((value) => Boolean(value))
            .join(" | ")
        : null;
    return (_jsxs("div", { className: "flex items-center gap-1.5 border-b border-slate-800 px-2.5 py-1 text-[10px] text-slate-400", children: [_jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: "neutral", children: "Smart Prompt" }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: webTone, children: "Web" }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: awarenessTone, children: "Aw." }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: modeTone, children: "Mode" }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: queryTone, children: "Query" }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: assistTone, children: "Assist" }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: ragTone, children: "RAG" }), _jsx(Badge, { className: "px-1.5 py-0.5 text-[10px]", tone: runtimeTone, children: "Aware" }), _jsx("span", { className: "min-w-0 flex-1 truncate", children: [summarizePromptContext(preview), runtimeSummary].filter(Boolean).join(" | ") })] }));
}
