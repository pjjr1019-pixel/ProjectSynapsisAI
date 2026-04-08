import type { InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400 transition placeholder:text-slate-500 focus:ring-2",
        props.className
      )}
    />
  );
}
