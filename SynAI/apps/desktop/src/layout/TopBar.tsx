import type { AppHealth, ModelHealth, ScreenAwarenessStatus } from "@contracts";
import { Badge } from "../shared/components/Badge";

interface TopBarProps {
  appHealth: AppHealth | null;
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
}

const formatScope = (scope: ScreenAwarenessStatus["scope"]): string => {
  switch (scope) {
    case "current-window":
      return "Current Window";
    case "selected-app":
      return "Selected App";
    case "chosen-display":
      return "Chosen Display";
    default:
      return "Off";
  }
};

export function TopBar({ appHealth, modelHealth, screenStatus }: TopBarProps) {
  const tone =
    modelHealth?.status === "connected"
      ? "good"
      : modelHealth?.status === "busy"
        ? "warn"
        : modelHealth?.status === "disconnected" || modelHealth?.status === "error"
          ? "bad"
          : "neutral";
  const assistTone = screenStatus?.assistMode.enabled ? "good" : "neutral";
  const awarenessTone = appHealth?.awareness?.ready ? "good" : appHealth?.awareness?.initializing ? "warn" : "neutral";

  return (
    <header className="flex h-11 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-3">
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold text-slate-100">SynAI Test Build</h1>
        <Badge tone="neutral">Smart Local Chat</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={tone}>{modelHealth?.status ?? "unknown"}</Badge>
        <Badge tone={awarenessTone}>{appHealth?.awareness?.ready ? "Aware Ready" : appHealth?.awareness?.initializing ? "Aware Init" : "Aware Off"}</Badge>
        <Badge tone={assistTone}>{screenStatus?.assistMode.enabled ? "Assist On" : "Assist Off"}</Badge>
        <span className="max-w-[180px] truncate text-xs text-slate-400">
          {screenStatus?.assistMode.enabled ? formatScope(screenStatus.scope) : "No screen capture"}
        </span>
        <span className="max-w-[220px] truncate text-xs text-slate-400">
          {appHealth?.awareness?.inFlightTargets.length
            ? `In flight: ${appHealth.awareness.inFlightTargets.join(", ")}`
            : modelHealth?.model ?? "No model"}
        </span>
      </div>
    </header>
  );
}
