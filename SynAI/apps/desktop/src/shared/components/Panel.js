import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils/cn";
export function Panel({ children, className, ...props }) {
    return (_jsx("div", { className: cn("rounded-lg border border-slate-800/70 bg-slate-950/60 p-3", className), ...props, children: children }));
}
