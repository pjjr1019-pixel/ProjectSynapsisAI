import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../utils/cn";
export function Input(props) {
    return (_jsx("input", { ...props, className: cn("w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 outline-none ring-cyan-400 transition placeholder:text-slate-500 focus:ring-2", props.className) }));
}
