import type { ModelHealth } from "@contracts";
import { Badge } from "../shared/components/Badge";

interface TopBarProps {
  modelHealth: ModelHealth | null;
}

export function TopBar({ modelHealth }: TopBarProps) {
  const tone =
    modelHealth?.status === "connected"
      ? "good"
      : modelHealth?.status === "busy"
        ? "warn"
        : modelHealth?.status === "disconnected" || modelHealth?.status === "error"
          ? "bad"
          : "neutral";

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-slate-100">SynAI Test Build</h1>
        <Badge tone="neutral">Smart Local Chat</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={tone}>{modelHealth?.status ?? "unknown"}</Badge>
        <span className="text-xs text-slate-400">{modelHealth?.model ?? "No model"}</span>
      </div>
    </header>
  );
}
