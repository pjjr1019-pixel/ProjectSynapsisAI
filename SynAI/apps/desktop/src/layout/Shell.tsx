import type { ReactNode } from "react";
import type { ModelHealth, ScreenAwarenessStatus } from "@contracts";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";

interface ShellProps {
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
  error: string | null;
  children: ReactNode;
}

export function Shell({ modelHealth, screenStatus, children, error }: ShellProps) {
  return (
    <div className="flex h-screen items-start overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex h-screen w-[520px] min-w-[520px] flex-col overflow-hidden border-r border-slate-800/60 bg-slate-950/90">
        <TopBar modelHealth={modelHealth} screenStatus={screenStatus} />
        <main className="flex min-h-0 flex-1 overflow-hidden bg-slate-950/70">{children}</main>
        <StatusBar error={error} screenStatus={screenStatus} />
      </div>
    </div>
  );
}
