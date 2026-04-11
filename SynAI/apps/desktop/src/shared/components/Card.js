import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils/cn";
export function Card({ children, className, ...props }) {
    return (_jsx("div", { className: cn("rounded-lg border border-slate-800 bg-slate-900/70", className), ...props, children: children }));
}
