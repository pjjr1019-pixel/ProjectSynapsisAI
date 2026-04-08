import type { ReactNode } from "react";
import { Badge } from "../shared/components/Badge";
import { featureRegistry } from "../features/feature-registry";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-3 border-r border-slate-800 bg-slate-950/70 p-3">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Staged Features</p>
        <ul className="space-y-1">
          {featureRegistry.map((feature) => (
            <li key={feature.id} className="flex items-center justify-between text-sm text-slate-300">
              <span>{feature.label}</span>
              <Badge tone={feature.status === "active" ? "good" : "neutral"}>{feature.status}</Badge>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </aside>
  );
}
