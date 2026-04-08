import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

interface CompactSectionProps extends HTMLAttributes<HTMLDetailsElement> {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CompactSection({
  title,
  summary,
  children,
  defaultOpen = false,
  className,
  ...props
}: CompactSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn("rounded-lg border border-slate-800 bg-slate-900/70", className)}
      {...props}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {summary ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{summary}</p> : null}
        </div>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">Toggle</span>
      </summary>
      <div className="border-t border-slate-800 px-3 py-2">{children}</div>
    </details>
  );
}
