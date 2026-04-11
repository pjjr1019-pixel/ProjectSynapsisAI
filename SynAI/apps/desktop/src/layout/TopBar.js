import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../shared/components/Badge";
const formatScope = (scope) => {
    switch (scope) {
        case "current-window":
            return "Current Window";
        case "selected-app":
            return "Selected App";
        case "chosen-display":
            return "Chosen Display";
        default:
            return "Off";
    }
};
export function TopBar({ appHealth, modelHealth, screenStatus }) {
    const tone = modelHealth?.status === "connected"
        ? "good"
        : modelHealth?.status === "busy"
            ? "warn"
            : modelHealth?.status === "disconnected" || modelHealth?.status === "error"
                ? "bad"
                : "neutral";
    const assistTone = screenStatus?.assistMode.enabled ? "good" : "neutral";
    const awarenessTone = appHealth?.awareness?.ready ? "good" : appHealth?.awareness?.initializing ? "warn" : "neutral";
    return (_jsxs("header", { className: "flex h-11 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-base font-semibold text-slate-100", children: "SynAI Test Build" }), _jsx(Badge, { tone: "neutral", children: "Smart Local Chat" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { tone: tone, children: modelHealth?.status ?? "unknown" }), _jsx(Badge, { tone: awarenessTone, children: appHealth?.awareness?.ready ? "Aware Ready" : appHealth?.awareness?.initializing ? "Aware Init" : "Aware Off" }), _jsx(Badge, { tone: assistTone, children: screenStatus?.assistMode.enabled ? "Assist On" : "Assist Off" }), _jsx("span", { className: "max-w-[180px] truncate text-xs text-slate-400", children: screenStatus?.assistMode.enabled ? formatScope(screenStatus.scope) : "No screen capture" }), _jsx("span", { className: "max-w-[220px] truncate text-xs text-slate-400", children: appHealth?.awareness?.inFlightTargets.length
                            ? `In flight: ${appHealth.awareness.inFlightTargets.join(", ")}`
                            : modelHealth?.model ?? "No model" })] })] }));
}
