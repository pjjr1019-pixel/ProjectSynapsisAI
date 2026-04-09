import type { ReactNode } from "react";
import type { AppHealth, ModelHealth, ScreenAwarenessStatus } from "@contracts";
import { TopBar } from "./TopBar";
import { StatusBar } from "./StatusBar";

interface ShellProps {
  appHealth: AppHealth | null;
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
  error: string | null;
  children: ReactNode;
}

export function Shell({ appHealth, modelHealth, screenStatus, children, error }: ShellProps) {
  return (
    <div className="flex h-screen items-start overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex h-screen w-[520px] min-w-[520px] flex-col overflow-hidden border-r border-slate-800/60 bg-slate-950/90">
        <TopBar appHealth={appHealth} modelHealth={modelHealth} screenStatus={screenStatus} />
        <main className="flex min-h-0 flex-1 overflow-hidden bg-slate-950/70">{children}</main>
        <StatusBar appHealth={appHealth} error={error} screenStatus={screenStatus} />
      </div>
    </div>
  );
}
