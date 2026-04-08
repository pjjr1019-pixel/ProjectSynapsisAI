import type { ScreenAwarenessStatus } from "@contracts";

interface StatusBarProps {
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

export function StatusBar({ error, screenStatus }: StatusBarProps) {
  return (
    <footer className="flex h-6 items-center border-t border-slate-800 bg-slate-950/90 px-3 text-[11px]">
      {error ? (
        <span className="text-rose-300">{error}</span>
      ) : screenStatus?.assistMode.enabled ? (
        <span className="text-emerald-300">
          Assist mode active | {formatScope(screenStatus.scope)} | {screenStatus.summary}
        </span>
      ) : (
        <span className="text-slate-500">Ready</span>
      )}
    </footer>
  );
}
