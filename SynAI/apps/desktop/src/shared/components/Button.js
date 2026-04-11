import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils/cn";
const variantClass = {
    primary: "bg-cyan-500/90 text-slate-950 hover:bg-cyan-400",
    ghost: "bg-slate-800 text-slate-200 hover:bg-slate-700",
    danger: "bg-rose-500/90 text-white hover:bg-rose-400"
};
export function Button({ children, className, variant = "primary", ...props }) {
    return (_jsx("button", { className: cn("rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50", variantClass[variant], className), ...props, children: children }));
}
