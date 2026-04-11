import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../shared/components/Badge";
import { CompactSection } from "../shared/components/CompactSection";
import { featureRegistry } from "../features/feature-registry";
export function Sidebar({ children }) {
    return (_jsxs("aside", { className: "flex h-full flex-col gap-2 bg-slate-950/70 p-2", children: [_jsx(CompactSection, { title: "Staged Features", summary: featureRegistry.map((feature) => feature.label).join(" | "), className: "text-[11px]", children: _jsx("ul", { className: "space-y-1", children: featureRegistry.map((feature) => (_jsxs("li", { className: "flex items-center justify-between gap-2 text-[11px] text-slate-300", children: [_jsx("span", { children: feature.label }), _jsx(Badge, { tone: feature.status === "active" ? "good" : "neutral", children: feature.status })] }, feature.id))) }) }), _jsx("div", { className: "flex-1 min-h-0", children: children })] }));
}
