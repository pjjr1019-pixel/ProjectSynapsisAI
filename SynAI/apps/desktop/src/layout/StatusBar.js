import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const formatScope = (scope) => {
    switch (scope) {
        case "current-window":
            return "Current Window";
        case "selected-app":
            return "Selected App";
        case "chosen-display":
            return "Chosen Display";
        default:
            return "Current Window";
    }
};
export function StatusBar({ appHealth, error, screenStatus }) {
    return (_jsx("footer", { className: "flex h-6 items-center border-t border-slate-800 bg-slate-950/90 px-3 text-[11px]", children: error ? (_jsx("span", { className: "text-rose-300", children: error })) : screenStatus?.assistMode.enabled ? (_jsxs("span", { className: "text-emerald-300", children: ["Assist mode active | ", formatScope(screenStatus.scope), " | ", screenStatus.summary] })) : appHealth?.awareness ? (_jsxs("span", { className: "text-slate-400", children: [appHealth.awareness.ready ? "Awareness ready" : appHealth.awareness.initializing ? "Awareness initializing" : "Awareness idle", appHealth.awareness.lastSampledAt ? ` | last sample ${appHealth.awareness.lastSampledAt.slice(11, 19)}` : "", appHealth.awareness.backgroundSamplerActive ? " | sampler active" : ""] })) : (_jsx("span", { className: "text-slate-500", children: "Ready" })) }));
}
