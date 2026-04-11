import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";
export function Shell({ appHealth, modelHealth, screenStatus, children, error }) {
    return (_jsx("div", { className: "flex h-screen items-start overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100", children: _jsxs("div", { className: "flex h-screen w-[520px] min-w-[520px] flex-col overflow-hidden border-r border-slate-800/60 bg-slate-950/90", children: [_jsx(TopBar, { appHealth: appHealth, modelHealth: modelHealth, screenStatus: screenStatus }), _jsx("main", { className: "flex min-h-0 flex-1 overflow-hidden bg-slate-950/70", children: children }), _jsx(StatusBar, { appHealth: appHealth, error: error, screenStatus: screenStatus })] }) }));
}
