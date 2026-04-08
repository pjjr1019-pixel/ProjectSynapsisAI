import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <div className={cn("rounded-lg border border-slate-800/70 bg-slate-950/60 p-3", className)} {...props}>
      {children}
    </div>
  );
}
