import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils/cn";
const toneClass = {
    neutral: "bg-slate-800 text-slate-200 border-slate-700",
    good: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
    warn: "bg-amber-500/20 text-amber-200 border-amber-400/50",
    bad: "bg-rose-500/20 text-rose-200 border-rose-400/50"
};
export function Badge({ children, className, tone = "neutral", ...props }) {
    return (_jsx("span", { className: cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", toneClass[tone], className), ...props, children: children }));
}
