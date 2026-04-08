import type { ReactNode } from "react";
import type { ModelHealth } from "@contracts";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

interface ShellProps {
  modelHealth: ModelHealth | null;
  sidebar: ReactNode;
  center: ReactNode;
  right: ReactNode;
  error: string | null;
}

export function Shell({ modelHealth, sidebar, center, right, error }: ShellProps) {
  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <TopBar modelHealth={modelHealth} />
      <main className="grid flex-1 grid-cols-[300px_1fr_340px] overflow-hidden">
        <Sidebar>{sidebar}</Sidebar>
        <section className="h-full overflow-hidden p-3">{center}</section>
        <aside className="h-full overflow-y-auto border-l border-slate-800 bg-slate-950/70 p-3">{right}</aside>
      </main>
      <StatusBar error={error} />
    </div>
  );
}
