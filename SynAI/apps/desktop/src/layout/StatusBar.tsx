import type { AppHealth, ScreenAwarenessStatus } from "@contracts";

interface StatusBarProps {
  appHealth: AppHealth | null;
  error: string | null;
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
      return "Current Window";
  }
};

export function StatusBar({ appHealth, error, screenStatus }: StatusBarProps) {
  return (
    <footer className="flex h-6 items-center border-t border-slate-800 bg-slate-950/90 px-3 text-[11px]">
      {error ? (
        <span className="text-rose-300">{error}</span>
      ) : screenStatus?.assistMode.enabled ? (
        <span className="text-emerald-300">
          Assist mode active | {formatScope(screenStatus.scope)} | {screenStatus.summary}
        </span>
      ) : appHealth?.awareness ? (
        <span className="text-slate-400">
          {appHealth.awareness.ready ? "Awareness ready" : appHealth.awareness.initializing ? "Awareness initializing" : "Awareness idle"}
          {appHealth.awareness.lastSampledAt ? ` | last sample ${appHealth.awareness.lastSampledAt.slice(11, 19)}` : ""}
          {appHealth.awareness.backgroundSamplerActive ? " | sampler active" : ""}
        </span>
      ) : (
        <span className="text-slate-500">Ready</span>
      )}
    </footer>
  );
}
