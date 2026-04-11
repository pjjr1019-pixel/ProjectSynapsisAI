import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { formatTime } from "../../../shared/utils/time";
const toneByStatus = {
    connected: "good",
    busy: "warn",
    disconnected: "bad",
    error: "bad"
};
export function LocalModelStatus({ modelHealth }) {
    if (!modelHealth) {
        return _jsx(Card, { className: "p-2 text-xs text-slate-400", children: "Model status unavailable." });
    }
    return (_jsxs(Card, { className: "space-y-1.5 p-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-100", children: "Local Model" }), _jsx(Badge, { tone: toneByStatus[modelHealth.status] ?? "neutral", children: modelHealth.status })] }), _jsx("p", { className: "truncate text-[11px] text-slate-300", children: modelHealth.model }), _jsx("p", { className: "truncate text-[10px] text-slate-500", children: modelHealth.baseUrl }), _jsxs("p", { className: "text-[10px] text-slate-500", children: ["Last checked ", formatTime(modelHealth.checkedAt)] }), modelHealth.detail ? _jsx("p", { className: "text-xs text-rose-300", children: modelHealth.detail }) : null] }));
}
