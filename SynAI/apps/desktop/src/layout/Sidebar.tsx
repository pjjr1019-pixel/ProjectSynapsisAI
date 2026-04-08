import type { ReactNode } from "react";
import { Badge } from "../shared/components/Badge";
import { CompactSection } from "../shared/components/CompactSection";
import { featureRegistry } from "../features/feature-registry";

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-2 bg-slate-950/70 p-2">
      <CompactSection
        title="Staged Features"
        summary={featureRegistry.map((feature) => feature.label).join(" | ")}
        className="text-[11px]"
      >
        <ul className="space-y-1">
          {featureRegistry.map((feature) => (
            <li key={feature.id} className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <span>{feature.label}</span>
              <Badge tone={feature.status === "active" ? "good" : "neutral"}>{feature.status}</Badge>
            </li>
          ))}
        </ul>
      </CompactSection>
      <div className="flex-1 min-h-0">{children}</div>
    </aside>
  );
}
