import type { WorkspaceTab } from "../types/localChat.types";
import { cn } from "../../../shared/utils/cn";

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "chat", label: "Chat" },
  { id: "history", label: "History" },
  { id: "tools", label: "Tools" },
  { id: "settings", label: "Settings" }
];

export function WorkspaceTabs({ activeTab, onChange }: WorkspaceTabsProps) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/90 px-2 py-1">
      <div role="tablist" aria-label="Workspace tabs" className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition",
                active
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                  : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
